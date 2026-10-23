-- Server-side functions so credits, call results and API-key lead ingestion are written
-- through audited, permission-checked paths instead of direct client writes.

-- One usage charge per call, ever.
create unique index credit_usage_per_call_idx on public.credit_transactions (call_id) where type = 'usage';

-- New organizations start with a clearly labelled simulated bonus.
create or replace function public.create_organization(org_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.organizations (name) values (org_name) returning id into new_id;
  insert into public.organization_members (organization_id, user_id, role) values (new_id, auth.uid(), 'owner');
  insert into public.credit_transactions (organization_id, type, amount, description, is_simulated)
    values (new_id, 'bonus', 50, 'Simulated welcome credits', true);
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id)
    values (new_id, auth.uid(), 'organization.created', 'organization', new_id);
  return new_id;
end $$;

create or replace function public.simulate_topup(p_org uuid, p_amount numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_org_role(p_org, array['owner','admin']::public.member_role[]) then
    raise exception 'forbidden';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 100000 then
    raise exception 'amount must be between 1 and 100000';
  end if;
  insert into public.credit_transactions (organization_id, type, amount, description, is_simulated)
    values (p_org, 'topup', p_amount, 'Simulated top-up (no payment taken)', true);
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, metadata)
    values (p_org, auth.uid(), 'billing.simulated_topup', 'credit_transactions', jsonb_build_object('amount', p_amount));
end $$;

-- Records the outcome of a SIMULATED call and charges 1 credit per started minute (completed calls only).
create or replace function public.complete_simulated_call(
  p_call uuid, p_status public.call_status, p_duration integer,
  p_transcript jsonb, p_summary text, p_outcome text, p_captured jsonb, p_error text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare c public.calls;
begin
  select * into c from public.calls where id = p_call;
  if not found then raise exception 'call not found'; end if;
  if not public.has_org_role(c.organization_id, array['owner','admin','member']::public.member_role[]) then
    raise exception 'forbidden';
  end if;
  if not c.is_simulated then raise exception 'only simulated calls can be completed here'; end if;
  if c.status in ('completed','failed','busy','no_answer','cancelled','provider_error') then return; end if;

  update public.calls
     set status = p_status, duration_seconds = p_duration, ended_at = now(), error = p_error,
         cost_credits = case when p_status = 'completed' then ceil(coalesce(p_duration,0) / 60.0) else 0 end
   where id = p_call;

  if p_status = 'completed' then
    insert into public.conversations (organization_id, call_id, transcript, summary, outcome, captured_data)
      values (c.organization_id, p_call, coalesce(p_transcript, '[]'), p_summary, p_outcome, coalesce(p_captured, '{}'))
      on conflict (call_id) do nothing;
    insert into public.credit_transactions (organization_id, type, amount, call_id, description, is_simulated)
      values (c.organization_id, 'usage', -ceil(coalesce(p_duration,0) / 60.0), p_call, 'Simulated call usage', true)
      on conflict do nothing;
  end if;
end $$;

-- API-key authentication for the public lead-ingestion endpoint. Only SHA-256 hashes are ever compared.
create or replace function public.ingest_lead(
  p_key_hash text, p_name text, p_phone text, p_email text, p_source text, p_consent boolean
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k public.api_keys; new_id uuid;
begin
  select * into k from public.api_keys where key_hash = p_key_hash and revoked_at is null;
  if not found then return jsonb_build_object('error', 'invalid_api_key'); end if;
  if p_phone is null or p_phone !~ '^\+[1-9][0-9]{6,14}$' then
    return jsonb_build_object('error', 'invalid_phone');
  end if;
  update public.api_keys set last_used_at = now() where id = k.id;

  insert into public.leads (organization_id, name, phone, email, source, consent_given)
    values (k.organization_id, left(p_name, 120), p_phone, left(p_email, 200), coalesce(left(p_source, 60), 'api'), coalesce(p_consent, false))
    on conflict (organization_id, phone) do nothing
    returning id into new_id;

  if new_id is null then
    return jsonb_build_object('duplicate', true);
  end if;
  return jsonb_build_object('id', new_id, 'duplicate', false);
end $$;

revoke all on function public.simulate_topup(uuid, numeric) from public, anon;
revoke all on function public.complete_simulated_call(uuid, public.call_status, integer, jsonb, text, text, jsonb, text) from public, anon;
revoke all on function public.ingest_lead(text, text, text, text, text, boolean) from public;
grant execute on function public.simulate_topup(uuid, numeric) to authenticated;
grant execute on function public.complete_simulated_call(uuid, public.call_status, integer, jsonb, text, text, jsonb, text) to authenticated;
-- ingest_lead is called by the server route with the anon key; the API key itself is the credential.
grant execute on function public.ingest_lead(text, text, text, text, text, boolean) to anon, authenticated;
