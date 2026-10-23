-- Applied after the initial schema in response to Supabase security advisors.
-- RLS policies call is_org_member/has_org_role as the signed-in role, so `authenticated` keeps EXECUTE; `anon` does not.
alter function public.set_updated_at() set search_path = public;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.has_org_role(uuid, public.member_role[]) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.member_role[]) to authenticated;
