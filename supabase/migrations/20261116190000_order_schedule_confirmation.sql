-- FixLook: dohodnuty termin je samostatny od preferencie zakaznika.
-- Novy datovy model neprepisuje starsie objednavky, bez migracie historickych terminov.
begin;
create table public.order_schedules (
  order_id uuid primary key references public.orders(id) on delete cascade,
  master_id uuid not null references public.profiles(id),
  proposed_start timestamptz not null,
  duration_minutes integer not null check(duration_minutes between 30 and 480 and duration_minutes % 30 = 0),
  status text not null check(status in ('proposed','confirmed')),
  proposed_at timestamptz not null default now(),
  confirmed_at timestamptz,
  constraint schedule_confirmed_at check ((status='confirmed') = (confirmed_at is not null))
);
create index order_schedules_master_idx on public.order_schedules(master_id, proposed_start);
alter table public.order_schedules enable row level security;
revoke all on public.order_schedules from public, anon, authenticated;
grant select on public.order_schedules to authenticated;
create policy "schedule participants read" on public.order_schedules
for select to authenticated using (
  exists (select 1 from public.orders o where o.id=order_id
   and (o.customer_id=(select auth.uid()) or o.master_id=(select auth.uid())))
  or (select public.is_admin())
);

create function public.propose_schedule(p_order uuid,p_start timestamptz,p_duration integer)
returns void language plpgsql security definer set search_path='' as $$
declare v_order public.orders;
begin
  select * into v_order from public.orders where id=p_order for update;
  if not found or v_order.master_id is distinct from auth.uid()
    or v_order.status not in ('assigned','accepted','in_progress')
  then raise exception 'Termín môže navrhnúť iba pridelený majster pri aktívnej zákazke.'; end if;
  if p_start is null or p_start<=now() or p_start>now()+interval '1 year'
    or p_duration is null or p_duration<30 or p_duration>480 or p_duration%30<>0
  then raise exception 'Vyberte budúci termín a trvanie 30 až 480 minút (po 30 minútach).'; end if;
  -- Serialized per master to avoid two parallel acceptances of same slot.
  perform pg_advisory_xact_lock(hashtextextended(v_order.master_id::text,0));
  if exists(
    select 1 from public.order_schedules s
    join public.orders o on o.id=s.order_id
    where s.master_id=v_order.master_id and s.order_id<>p_order
    and s.status='confirmed' and o.status not in ('cancelled','completed')
    and tstzrange(s.proposed_start,s.proposed_start+make_interval(mins=>s.duration_minutes),'[)')
      && tstzrange(p_start,p_start+make_interval(mins=>p_duration),'[)')
  ) then raise exception 'Majster už má v tomto čase potvrdenú inú zákazku.'; end if;
  insert into public.order_schedules(order_id,master_id,proposed_start,duration_minutes,status,confirmed_at,proposed_at)
  values (p_order,v_order.master_id,p_start,p_duration,'proposed',null,now())
  on conflict(order_id) do update set
    master_id=excluded.master_id, proposed_start=excluded.proposed_start,
    duration_minutes=excluded.duration_minutes,status='proposed',
    confirmed_at=null, proposed_at=now();
end $$;

create function public.respond_to_schedule(p_order uuid,p_accept boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_order public.orders; v_schedule public.order_schedules;
begin
  select * into v_order from public.orders where id=p_order for update;
  if not found or v_order.customer_id is distinct from auth.uid()
    or v_order.status not in ('assigned','accepted','in_progress')
  then raise exception 'Termín môže potvrdiť iba zákazník aktívnej objednávky.'; end if;
  select * into v_schedule from public.order_schedules
  where order_id=p_order for update;
  if not found or v_schedule.status<>'proposed'
    or v_schedule.master_id is distinct from v_order.master_id
  then raise exception 'Žiadny aktuálny návrh termínu na potvrdenie.'; end if;
  if p_accept then
    if v_schedule.proposed_start<=now() then raise exception 'Navrhnutý termín už uplynul.'; end if;
    perform pg_advisory_xact_lock(hashtextextended(v_schedule.master_id::text,0));
    if exists (
      select 1 from public.order_schedules s join public.orders o on o.id=s.order_id
      where s.master_id=v_schedule.master_id and s.order_id<>p_order
      and s.status='confirmed' and o.status not in ('cancelled','completed')
      and tstzrange(s.proposed_start,s.proposed_start+make_interval(mins=>s.duration_minutes),'[)')
       && tstzrange(v_schedule.proposed_start,v_schedule.proposed_start+make_interval(mins=>v_schedule.duration_minutes),'[)')
    ) then raise exception 'Termín je už obsadený. Požiadajte majstra o iný termín.'; end if;
    update public.order_schedules set status='confirmed',confirmed_at=now() where order_id=p_order;
  else
    delete from public.order_schedules where order_id=p_order;
  end if;
end $$;

revoke all on function public.propose_schedule(uuid,timestamptz,integer) from public,anon;
revoke all on function public.respond_to_schedule(uuid,boolean) from public,anon;
grant execute on function public.propose_schedule(uuid,timestamptz,integer) to authenticated;
grant execute on function public.respond_to_schedule(uuid,boolean) to authenticated;
commit;
