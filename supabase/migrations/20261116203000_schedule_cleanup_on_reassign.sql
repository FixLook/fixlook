-- Odstráni neaktuálnu rezerváciu pri zmene majstra alebo zrušení objednávky.
-- Nemení historické platby ani cenové ponuky.
begin;
create function public.cleanup_order_schedule()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.master_id is distinct from new.master_id
     or (new.status='cancelled' and old.status is distinct from new.status) then
    delete from public.order_schedules where order_id=new.id;
  end if;
  return new;
end $$;
revoke all on function public.cleanup_order_schedule() from public,anon,authenticated;
create trigger cleanup_order_schedule_on_order_change
after update of master_id,status on public.orders
for each row execute function public.cleanup_order_schedule();
commit;
