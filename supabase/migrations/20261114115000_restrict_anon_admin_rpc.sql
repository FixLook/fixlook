-- Limit unauthenticated RPC execution of is_admin() without affecting public service catalog.
-- Tested only in isolated FixLook Supabase before any production deployment.
begin;

drop policy if exists "services active public read" on public.services;
create policy "services active anonymous read" on public.services
  for select to anon using (active = true);
create policy "services active authenticated read" on public.services
  for select to authenticated using (active = true or public.is_admin());

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

commit;
