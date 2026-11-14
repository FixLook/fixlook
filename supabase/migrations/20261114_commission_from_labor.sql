-- Prepared for review only; DO NOT run on production before approval and a tested backup.
-- Never recalculate historical payment amounts, commissions or customer-approved quotes.
-- Basis points: 1000 = 10%; 1500 = 15%. No rate is preselected.
begin;

create table public.platform_commission_settings (
  singleton boolean primary key default true check (singleton),
  commission_rate_bps integer not null check (commission_rate_bps between 0 and 10000),
  updated_at timestamptz not null default now()
);
alter table public.platform_commission_settings enable row level security;
revoke all on table public.platform_commission_settings from public, anon, authenticated;
-- Only trusted operators may explicitly set a rate after commercial approval.
-- Example, intentionally NOT executed:
-- insert into public.platform_commission_settings(singleton,commission_rate_bps)
-- values (true, 1000) on conflict(singleton) do update
-- set commission_rate_bps = excluded.commission_rate_bps,updated_at=now();

create or replace function public.respond_to_quote(p_quote uuid, p_accept boolean, p_note text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare v_quote public.order_quotes; v_order public.orders; v_order_id uuid; v_rate integer;
begin
  select order_id into v_order_id from public.order_quotes where id = p_quote;
  select * into v_order from public.orders where id = v_order_id for update;
  select * into v_quote from public.order_quotes where id = p_quote for update;
  if v_quote.id is null or auth.uid() is null or v_order.customer_id is distinct from auth.uid() then raise exception 'K ponuke nemáte prístup.'; end if;
  if v_quote.status <> 'proposed' or v_order.status not in ('accepted','in_progress') then raise exception 'Ponuka sa medzičasom zmenila. Obnovte stránku.'; end if;
  if char_length(coalesce(p_note,'')) > 1000 then raise exception 'Poznámka môže mať najviac 1 000 znakov.'; end if;
  update public.order_quotes set status = case when p_accept then 'accepted' else 'rejected' end,
    accepted_by = case when p_accept then auth.uid() else null end, response_note = btrim(p_note), responded_at = now() where id = p_quote;
  perform public.post_order_event(v_order.id, case when p_accept then 'Zákazník schválil cenovú ponuku. Čaká sa na jej úhradu.' else 'Zákazník odmietol cenovú ponuku. Podrobnosti nájdete v detaile objednávky.' end);
  if p_accept then
    select commission_rate_bps into v_rate from public.platform_commission_settings where singleton = true;
    if v_rate is null then raise exception 'Provízia FixLook nie je nastavená. Kontaktujte podporu.'; end if;
    insert into public.payments(order_id,quote_id,amount,commission_amount,master_amount)
      values(v_order.id,v_quote.id,v_quote.total_amount,
        round(v_quote.labor_amount::numeric * v_rate / 10000)::integer,
        v_quote.total_amount - round(v_quote.labor_amount::numeric * v_rate / 10000)::integer);
    update public.orders set final_price = coalesce((select sum(total_amount) from public.order_quotes where order_id = v_order.id and status = 'accepted'),0)
      + coalesce((select sum(amount) from public.payments where order_id = v_order.id and quote_id is null and status in ('paid','refunded')),0)
      where id = v_order.id;
  end if;
end $$;

commit;
