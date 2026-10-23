-- FlowVoice initial schema: multi-tenant, RLS-enforced.
-- Review before applying. Apply with `supabase db push` or the Supabase MCP against a verified project.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums
create type public.member_role as enum ('owner', 'admin', 'member', 'viewer');
create type public.employee_status as enum ('draft', 'active', 'paused', 'archived');
create type public.calling_mode as enum ('outbound', 'inbound', 'both');
create type public.call_direction as enum ('inbound', 'outbound');
create type public.call_status as enum (
  'queued', 'initiating', 'ringing', 'connected', 'processing', 'completed',
  'failed', 'busy', 'no_answer', 'cancelled', 'provider_error'
);
create type public.campaign_status as enum ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled');
create type public.contact_status as enum ('pending', 'calling', 'completed', 'failed', 'skipped', 'opted_out');
create type public.lead_status as enum ('new', 'queued', 'contacted', 'qualified', 'unqualified', 'callback', 'booked', 'do_not_call');
create type public.knowledge_status as enum ('pending', 'processing', 'ready', 'failed');
create type public.number_status as enum ('available', 'assigned', 'suspended', 'error');
create type public.txn_type as enum ('topup', 'usage', 'refund', 'adjustment', 'bonus');

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- tenancy
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  timezone text not null default 'Asia/Kolkata',
  calling_hours_start time not null default '09:00',
  calling_hours_end time not null default '20:00',
  default_max_retries smallint not null default 2 check (default_max_retries between 0 and 10),
  retention_days integer not null default 90 check (retention_days between 7 and 3650),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index on public.organization_members (user_id);

-- Membership helpers (security definer so policies on other tables don't recurse).
create or replace function public.is_org_member(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org and user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(org uuid, roles public.member_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org and user_id = auth.uid() and role = any(roles)
  );
$$;

-- Creates an org and makes the caller its owner. The org id is never taken from the browser.
create or replace function public.create_organization(org_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.organizations (name) values (org_name) returning id into new_id;
  insert into public.organization_members (organization_id, user_id, role) values (new_id, auth.uid(), 'owner');
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id)
    values (new_id, auth.uid(), 'organization.created', 'organization', new_id);
  return new_id;
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- audit (created early; referenced above)
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.audit_logs (organization_id, created_at desc);

-- ---------------------------------------------------------------- employees
create table public.phone_numbers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  e164 text not null check (e164 ~ '^\+[1-9][0-9]{6,14}$'),
  provider text not null,
  provider_number_id text,
  label text,
  status public.number_status not null default 'available',
  capabilities jsonb not null default '{"voice": true}',
  inbound_employee_id uuid,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, e164)
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  purpose text,
  objective text,
  status public.employee_status not null default 'draft',
  calling_mode public.calling_mode not null default 'outbound',
  voice text,
  language text not null default 'en-IN',
  greeting text,
  system_prompt text,
  qualification_questions jsonb not null default '[]',
  capture_fields jsonb not null default '[]',
  allowed_actions jsonb not null default '[]',
  phone_number_id uuid references public.phone_numbers(id) on delete set null,
  published_version integer,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.employees (organization_id, status);

alter table public.phone_numbers
  add constraint phone_numbers_inbound_employee_fk
  foreign key (inbound_employee_id) references public.employees(id) on delete set null;

create table public.employee_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (employee_id, version)
);

create table public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  kind text not null check (kind in ('pdf', 'text', 'website', 'faq')),
  title text not null,
  storage_path text,
  source_url text,
  content text,
  status public.knowledge_status not null default 'pending',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.knowledge_sources (employee_id);

-- ---------------------------------------------------------------- leads & campaigns
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text,
  phone text not null check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  email text,
  source text not null default 'manual',
  status public.lead_status not null default 'new',
  assigned_employee_id uuid references public.employees(id) on delete set null,
  captured_data jsonb not null default '{}',
  consent_given boolean not null default false,
  opted_out_at timestamptz,
  callback_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, phone)  -- duplicate detection
);
create index on public.leads (organization_id, status, created_at desc);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  employee_id uuid references public.employees(id) on delete set null,
  status public.campaign_status not null default 'draft',
  timezone text not null default 'Asia/Kolkata',
  window_start time not null default '09:00',
  window_end time not null default '20:00',
  max_concurrency smallint not null default 3 check (max_concurrency between 1 and 50),
  max_retries smallint not null default 2 check (max_retries between 0 and 10),
  retry_delay_minutes integer not null default 60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.campaigns (organization_id, status);

create table public.campaign_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  phone text not null check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  name text,
  data jsonb not null default '{}',
  status public.contact_status not null default 'pending',
  attempts smallint not null default 0,
  next_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campaign_id, phone)
);
create index on public.campaign_contacts (campaign_id, status, next_attempt_at);

-- ---------------------------------------------------------------- calls
create table public.calls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  campaign_contact_id uuid references public.campaign_contacts(id) on delete set null,
  direction public.call_direction not null,
  status public.call_status not null default 'queued',
  from_number text,
  to_number text not null,
  is_simulated boolean not null default true,
  provider text,
  provider_call_id text,
  idempotency_key text,
  duration_seconds integer check (duration_seconds >= 0),
  cost_credits numeric(12, 4) not null default 0,
  recording_path text,
  error text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.calls (organization_id, created_at desc);
create index on public.calls (organization_id, status);
create index on public.calls (lead_id);
create index on public.calls (campaign_id);
create index on public.calls (employee_id);
create unique index calls_idempotency_idx on public.calls (organization_id, idempotency_key) where idempotency_key is not null;
create unique index calls_provider_idx on public.calls (provider, provider_call_id) where provider_call_id is not null;

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  call_id uuid not null unique references public.calls(id) on delete cascade,
  transcript jsonb not null default '[]',  -- [{speaker, text, at_ms}]
  summary text,
  outcome text,
  captured_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  scheduled_for timestamptz not null,
  status text not null default 'booked' check (status in ('booked', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- developers
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,  -- sha256 of the secret; the secret is shown once and never stored
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  url text not null check (url ~ '^https://'),
  events text[] not null default '{}',
  secret text not null,  -- server-only; column access is revoked from client roles below
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  endpoint_id uuid references public.webhook_endpoints(id) on delete cascade,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  response_status integer,
  attempts smallint not null default 0,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (endpoint_id, event_id)
);

-- Inbound provider events, deduplicated for idempotent processing.
create table public.provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

-- ---------------------------------------------------------------- billing & notifications
create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type public.txn_type not null,
  amount numeric(12, 4) not null,  -- positive adds credits, negative consumes
  call_id uuid references public.calls(id) on delete set null,
  description text,
  is_simulated boolean not null default true,
  provider_reference text,
  created_at timestamptz not null default now()
);
create index on public.credit_transactions (organization_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['organizations','profiles','phone_numbers','employees','knowledge_sources',
                           'leads','campaigns','calls','conversations']
  loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- RLS
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.provider_events enable row level security;  -- no policies: service role only

create policy "members read org" on public.organizations
  for select using (public.is_org_member(id));
create policy "admins update org" on public.organizations
  for update using (public.has_org_role(id, array['owner','admin']::public.member_role[]));

create policy "read own profile" on public.profiles for select using (id = auth.uid());
create policy "update own profile" on public.profiles for update using (id = auth.uid());

create policy "members read memberships" on public.organization_members
  for select using (public.is_org_member(organization_id));
create policy "admins manage memberships" on public.organization_members
  for all using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

-- Standard tenant tables: members read; owner/admin/member write.
do $$
declare t text;
begin
  foreach t in array array['employees','employee_versions','knowledge_sources','phone_numbers','leads',
                           'campaigns','campaign_contacts','calls','conversations','appointments','notifications']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "members read" on public.%I for select using (public.is_org_member(organization_id))', t);
    execute format('create policy "writers insert" on public.%I for insert
                    with check (public.has_org_role(organization_id, array[''owner'',''admin'',''member'']::public.member_role[]))', t);
    execute format('create policy "writers update" on public.%I for update
                    using (public.has_org_role(organization_id, array[''owner'',''admin'',''member'']::public.member_role[]))
                    with check (public.has_org_role(organization_id, array[''owner'',''admin'',''member'']::public.member_role[]))', t);
    execute format('create policy "writers delete" on public.%I for delete
                    using (public.has_org_role(organization_id, array[''owner'',''admin'']::public.member_role[]))', t);
  end loop;
end $$;

-- Read-only from the client; writes happen server-side with the service role (auditable).
do $$
declare t text;
begin
  foreach t in array array['credit_transactions','audit_logs','webhook_deliveries']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "members read" on public.%I for select using (public.is_org_member(organization_id))', t);
  end loop;
end $$;

-- Developer credentials: admins only.
alter table public.api_keys enable row level security;
alter table public.webhook_endpoints enable row level security;
create policy "admins manage api keys" on public.api_keys for all
  using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));
create policy "admins manage webhooks" on public.webhook_endpoints for all
  using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

-- Never let browser roles read the webhook signing secret.
-- (A column revoke is a no-op under a table-level grant, so revoke the table grant and re-grant the safe columns.)
revoke select on public.webhook_endpoints from anon, authenticated;
grant select (id, organization_id, url, events, enabled, created_at) on public.webhook_endpoints to authenticated;

-- ---------------------------------------------------------------- RPC grants
revoke all on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;

-- ---------------------------------------------------------------- private storage
insert into storage.buckets (id, name, public) values ('recordings', 'recordings', false), ('knowledge', 'knowledge', false)
on conflict (id) do nothing;
-- Objects are laid out as <organization_id>/<file>; access is scoped to org members.
create policy "members read org files" on storage.objects for select
  using (bucket_id in ('recordings', 'knowledge') and public.is_org_member(((storage.foldername(name))[1])::uuid));
create policy "members upload knowledge" on storage.objects for insert
  with check (bucket_id = 'knowledge' and public.is_org_member(((storage.foldername(name))[1])::uuid));
