-- FixLook: voluntary verification applications for masters; preserves existing approvals.
-- Deploy only after review in an isolated Supabase project. No historical rows modified.
begin;
create table public.master_verification_applications (
  master_id uuid primary key references public.masters(profile_id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','needs_changes','approved','rejected')),
  specialty text not null check(char_length(specialty) between 2 and 160),
  years_experience integer not null check(years_experience between 0 and 70),
  ico text check(ico is null or ico ~ '^[0-9]{8}$'),
  references_text text check(references_text is null or char_length(references_text)<=2000),
  motivation text not null check(char_length(motivation) between 20 and 4000),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  review_reason text check(review_reason is null or char_length(review_reason)<=2000),
  constraint review_state check (
    (status='pending' and reviewed_at is null and reviewed_by is null)
    or (status<>'pending' and reviewed_at is not null and reviewed_by is not null)
  )
);
alter table public.master_verification_applications enable row level security;
revoke all on public.master_verification_applications from public,anon,authenticated;
grant select on public.master_verification_applications to authenticated;
create policy "verification applicant or admin read" on public.master_verification_applications
for select to authenticated using (master_id=(select auth.uid()) or (select public.is_admin()));

create table public.master_verification_documents (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references public.masters(profile_id) on delete cascade,
  storage_path text not null unique,
  original_name text not null check(char_length(original_name) between 1 and 200),
  uploaded_at timestamptz not null default now(),
  constraint owned_document_path check (split_part(storage_path,'/',1)=master_id::text)
);
create index master_verification_documents_owner_idx on public.master_verification_documents(master_id);
alter table public.master_verification_documents enable row level security;
revoke all on public.master_verification_documents from public,anon,authenticated;
grant select,insert,delete on public.master_verification_documents to authenticated;
create policy "verification docs participants read" on public.master_verification_documents
for select to authenticated using(master_id=(select auth.uid()) or (select public.is_admin()));
create policy "verification docs applicant insert" on public.master_verification_documents
for insert to authenticated with check(
  master_id=(select auth.uid())
  and exists(select 1 from public.masters m where m.profile_id=master_id and not m.verified)
  and not exists(select 1 from public.master_verification_applications a where a.master_id=master_id and a.status in ('pending','approved'))
);
create policy "verification docs applicant delete" on public.master_verification_documents
for delete to authenticated using(
  master_id=(select auth.uid())
  and exists(select 1 from public.masters m where m.profile_id=master_id and not m.verified)
  and not exists(select 1 from public.master_verification_applications a where a.master_id=master_id and a.status in ('pending','approved'))
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('master-verification','master-verification',false,5242880,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do nothing;
create policy "verification files private read" on storage.objects for select to authenticated
using(bucket_id='master-verification' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select public.is_admin())));
create policy "verification files own upload" on storage.objects for insert to authenticated
with check(bucket_id='master-verification' and (storage.foldername(name))[1]=(select auth.uid())::text
and lower(storage.extension(name)) in ('pdf','jpg','jpeg','png')
and exists(select 1 from public.masters m where m.profile_id=(select auth.uid()) and not m.verified)
and not exists(select 1 from public.master_verification_applications a where a.master_id=(select auth.uid()) and a.status in ('pending','approved'))
);
create policy "verification files own cleanup" on storage.objects for delete to authenticated
using(bucket_id='master-verification' and (storage.foldername(name))[1]=(select auth.uid())::text
and not exists(select 1 from public.master_verification_applications a where a.master_id=(select auth.uid()) and a.status in ('pending','approved'))
);

create function public.submit_master_verification(p_specialty text,p_years integer,p_ico text,p_references text,p_motivation text)
returns void language plpgsql security definer set search_path='' as $$
declare v_master public.masters; v_application public.master_verification_applications;
begin
  select * into v_master from public.masters where profile_id=auth.uid() for update;
  if not found or v_master.verified then raise exception 'Overenie môže žiadať iba neoverený majster.'; end if;
  if p_specialty is null or char_length(btrim(p_specialty)) not between 2 and 160
    or p_years is null or p_years<0 or p_years>70
    or (nullif(btrim(p_ico),'') is not null and btrim(p_ico) !~ '^[0-9]{8}$')
    or char_length(coalesce(p_references,''))>2000
    or p_motivation is null or char_length(btrim(p_motivation)) not between 20 and 4000
  then raise exception 'Skontrolujte údaje žiadosti.'; end if;
  select * into v_application from public.master_verification_applications where master_id=auth.uid() for update;
  if found and v_application.status in ('pending','approved') then raise exception 'Žiadosť sa už spracúva alebo je schválená.'; end if;
  insert into public.master_verification_applications(master_id,status,specialty,years_experience,ico,references_text,motivation)
  values(auth.uid(),'pending',btrim(p_specialty),p_years,nullif(btrim(p_ico),''),nullif(btrim(p_references),''),btrim(p_motivation))
  on conflict(master_id) do update set
   status='pending',specialty=excluded.specialty,years_experience=excluded.years_experience,ico=excluded.ico,
   references_text=excluded.references_text,motivation=excluded.motivation,submitted_at=now(),
   reviewed_at=null,reviewed_by=null,review_reason=null;
end $$;
revoke all on function public.submit_master_verification(text,integer,text,text,text) from public,anon;
grant execute on function public.submit_master_verification(text,integer,text,text,text) to authenticated;

create function public.review_master_verification(p_master uuid,p_decision text,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare v_application public.master_verification_applications;
begin
  if not public.is_admin() then raise exception 'Prístup má iba administrátor.'; end if;
  if p_decision not in ('approved','needs_changes','rejected') or char_length(coalesce(p_reason,''))>2000
   or (p_decision<>'approved' and char_length(btrim(coalesce(p_reason,'')))<10)
  then raise exception 'Zadajte platné rozhodnutie a odôvodnenie.'; end if;
  perform 1 from public.masters where profile_id=p_master for update;
  select * into v_application from public.master_verification_applications where master_id=p_master for update;
  if not found or v_application.status<>'pending' then raise exception 'Nie je dostupná čakajúca žiadosť.'; end if;
  update public.master_verification_applications set status=p_decision,
    reviewed_at=now(),reviewed_by=auth.uid(),review_reason=nullif(btrim(p_reason),'')
    where master_id=p_master;
  update public.masters set verified=(p_decision='approved'),
    available=case when p_decision='approved' then available else false end
    where profile_id=p_master;
end $$;
revoke all on function public.review_master_verification(uuid,text,text) from public,anon;
grant execute on function public.review_master_verification(uuid,text,text) to authenticated;
commit;