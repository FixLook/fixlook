-- A confirmed appointment stays reserved until a replacement is explicitly confirmed.
-- Non-destructive addition to the new order_schedules table (no historic orders changed).
begin;
alter table public.order_schedules add column previous_start timestamptz;
alter table public.order_schedules add column previous_duration_minutes integer;
alter table public.order_schedules add column previous_confirmed_at timestamptz;
alter table public.order_schedules add constraint schedule_previous_complete check(
  (previous_start is null and previous_duration_minutes is null and previous_confirmed_at is null)
  or (previous_start is not null and previous_duration_minutes is not null and previous_confirmed_at is not null)
);

create or replace function public.propose_schedule(p_order uuid,p_start timestamptz,p_duration integer)
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

  perform pg_advisory_xact_lock(hashtextextended(v_order.master_id::text,0));
  if exists(
    select 1 from public.order_schedules s
    join public.orders o on o.id=s.order_id
    where s.master_id=v_order.master_id and s.order_id<>p_order
    and o.status not in ('cancelled','completed')
    and (s.status='confirmed' or s.previous_start is not null)
    and tstzrange(
      case when s.status='confirmed' then s.proposed_start else s.previous_start end,
      (case when s.status='confirmed' then s.proposed_start else s.previous_start end)
        + make_interval(mins=>case when s.status='confirmed' then s.duration_minutes else s.previous_duration_minutes end),
      '[)'
    ) && tstzrange(p_start,p_start+make_interval(mins=>p_duration),'[)')
  ) then raise exception 'Majster už má v tomto čase potvrdenú inú zákazku.'; end if;

  insert into public.order_schedules(order_id,master_id,proposed_start,duration_minutes,status,confirmed_at,proposed_at)
  values (p_order,v_order.master_id,p_start,p_duration,'proposed',null,now())
  on conflict(order_id) do update set
    previous_start=case when public.order_schedules.status='confirmed'
      then public.order_schedules.proposed_start else public.order_schedules.previous_start end,
    previous_duration_minutes=case when public.order_schedules.status='confirmed'
      then public.order_schedules.duration_minutes else public.order_schedules.previous_duration_minutes end,
    previous_confirmed_at=case when public.order_schedules.status='confirmed'
      then public.order_schedules.confirmed_at else public.order_schedules.previous_confirmed_at end,
    master_id=excluded.master_id, proposed_start=excluded.proposed_start,
    duration_minutes=excluded.duration_minutes,status='proposed',
    confirmed_at=null,proposed_at=now();
end $$;

create or replace function public.respond_to_schedule(p_order uuid,p_accept boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_order public.orders; v_schedule public.order_schedules;
begin
  select * into v_order from public.orders where id=p_order for update;
  if not found or v_order.customer_id is distinct from auth.uid()
    or v_order.status not in ('assigned','accepted','in_progress')
  then raise exception 'Termín môže potvrdiť iba zákazník aktívnej objednávky.'; end if;
  select * into v_schedule from public.order_schedules where order_id=p_order for update;
  if not found or v_schedule.status<>'proposed'
    or v_schedule.master_id is distinct from v_order.master_id
  then raise exception 'Žiadny aktuálny návrh termínu na potvrdenie.'; end if;
  if p_accept then
    if v_schedule.proposed_start<=now() then raise exception 'Navrhnutý termín už uplynul.'; end if;
    perform pg_advisory_xact_lock(hashtextextended(v_schedule.master_id::text,0));
    if exists(
      select 1 from public.order_schedules s join public.orders o on o.id=s.order_id
      where s.master_id=v_schedule.master_id and s.order_id<>p_order
      and o.status not in ('cancelled','completed')
      and (s.status='confirmed' or s.previous_start is not null)
      and tstzrange(
        case when s.status='confirmed' then s.proposed_start else s.previous_start end,
        (case when s.status='confirmed' then s.proposed_start else s.previous_start end)
          + make_interval(mins=>case when s.status='confirmed' then s.duration_minutes else s.previous_duration_minutes end),
        '[)'
      ) && tstzrange(v_schedule.proposed_start,v_schedule.proposed_start+make_interval(mins=>v_schedule.duration_minutes),'[)')
    ) then raise exception 'Termín je už obsadený. Požiadajte majstra o iný termín.'; end if;
    update public.order_schedules set status='confirmed',confirmed_at=now(),
      previous_start=null,previous_duration_minutes=null,previous_confirmed_at=null
    where order_id=p_order;
  elsif v_schedule.previous_start is not null then
    update public.order_schedules
    set proposed_start=previous_start,duration_minutes=previous_duration_minutes,
      status='confirmed',confirmed_at=previous_confirmed_at,
      previous_start=null,previous_duration_minutes=null,previous_confirmed_at=null
    where order_id=p_order;
  else
    delete from public.order_schedules where order_id=p_order;
  end if;
end $$;

revoke all on function public.propose_schedule(uuid,timestamptz,integer) from public,anon;
revoke all on function public.respond_to_schedule(uuid,boolean) from public,anon;
grant execute on function public.propose_schedule(uuid,timestamptz,integer) to authenticated;
grant execute on function public.respond_to_schedule(uuid,boolean) to authenticated;
commit;
