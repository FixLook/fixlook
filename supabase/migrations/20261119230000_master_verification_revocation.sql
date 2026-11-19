-- Keep legacy manual revocations consistent with the application workflow.
begin;
create or replace function public.verify_master(p_master uuid,p_verified boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'Prístup je povolený iba administrátorovi.'; end if;
  if p_verified and not exists(
    select 1 from public.master_verification_applications a
    where a.master_id=p_master and a.status='approved'
  ) then raise exception 'Majstra možno overiť iba po schválení žiadosti.'; end if;
  update public.masters set verified=p_verified,
    available=case when p_verified then available else false end
    where profile_id=p_master;
  if not found then raise exception 'Majster sa nenašiel.'; end if;
  if not p_verified then
    update public.master_verification_applications
    set status='rejected',reviewed_at=now(),reviewed_by=auth.uid(),
      review_reason='Overenie bolo zrušené administrátorom. Po doplnení údajov môžete podať novú žiadosť.'
    where master_id=p_master and status='approved';
  end if;
end $$;
revoke all on function public.verify_master(uuid,boolean) from public,anon;
grant execute on function public.verify_master(uuid,boolean) to authenticated;
commit;