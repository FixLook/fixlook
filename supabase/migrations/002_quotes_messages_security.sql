-- Apply once, after 001_init.sql. Keep old orders/payments; never infer customer consent.
begin;

alter table public.services add column estimate_max integer;
alter table public.services add constraint services_estimate_range check (estimate_max is null or estimate_max >= base_price);
alter table public.orders add column estimated_price_max integer;
alter table public.orders add column client_request_id uuid;
create unique index order_request_once on public.orders(customer_id, client_request_id) where client_request_id is not null;
alter table public.orders alter column city set default 'Košice';

create table public.order_quotes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  created_by uuid not null references public.profiles(id),
  kind text not null check (kind in ('initial', 'extra')),
  scope text not null check (char_length(btrim(scope)) between 10 and 4000),
  labor_amount integer not null check (labor_amount between 0 and 10000000),
  materials_amount integer not null check (materials_amount between 0 and 10000000),
  travel_amount integer not null check (travel_amount between 0 and 10000000),
  total_amount integer generated always as (labor_amount + materials_amount + travel_amount) stored,
  status text not null default 'proposed' check (status in ('proposed','accepted','rejected','superseded')),
  response_note text,
  accepted_by uuid references public.profiles(id),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  check (labor_amount + materials_amount + travel_amount between 50 and 10000000)
);
create unique index one_proposed_quote on public.order_quotes(order_id) where status = 'proposed';
create unique index one_initial_quote on public.order_quotes(order_id) where kind = 'initial' and status = 'accepted';
create index quotes_order on public.order_quotes(order_id, created_at);

alter table public.payments drop constraint payments_order_id_key;
alter table public.payments add column quote_id uuid unique references public.order_quotes(id);
alter table public.payments add column stripe_checkout_session_id text unique;
alter table public.payments add column checkout_attempt integer not null default 0;
alter table public.payments add column attempt_started_at timestamptz;
alter table public.payments add column refunded_amount integer not null default 0 check (refunded_amount >= 0 and refunded_amount <= amount);
create unique index payments_intent_unique on public.payments(stripe_payment_intent_id) where stripe_payment_intent_id is not null;

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('order','support')),
  order_id uuid references public.orders(id),
  owner_id uuid references public.profiles(id),
  subject text not null check (char_length(btrim(subject)) between 3 and 160),
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'order' and order_id is not null and owner_id is null) or (kind = 'support' and owner_id is not null))
);
create unique index one_order_conversation on public.conversations(order_id) where kind = 'order';
create index support_owner on public.conversations(owner_id, updated_at desc);
create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations(id),
  sender_id uuid not null references public.profiles(id),
  sender_name text not null,
  sender_role public.user_role not null,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  client_id uuid not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (sender_id, client_id)
);
create index messages_conversation on public.messages(conversation_id, id desc);
create index messages_rate_limit on public.messages(sender_id, created_at desc);
create table public.conversation_reads (
  conversation_id uuid not null references public.conversations(id),
  profile_id uuid not null references public.profiles(id),
  last_message_id bigint not null default 0,
  primary key (conversation_id, profile_id)
);

-- No browser can change role, verification, payment state, prices or order ownership.
revoke insert, update, delete on public.profiles, public.masters, public.orders, public.payments from anon, authenticated;
grant update (full_name, phone, city) on public.profiles to authenticated;
grant update (description, hourly_rate, available) on public.masters to authenticated;
drop policy "profiles insert own" on public.profiles;
drop policy "masters insert own or admin" on public.masters;
drop policy "orders customer insert" on public.orders;
drop policy "orders participant update" on public.orders;
drop policy "payments admin manage" on public.payments;

create or replace function public.can_access_order(p_order uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (select 1 from public.orders o
    where o.id = p_order and (o.customer_id = auth.uid() or o.master_id = auth.uid() or public.is_admin()));
$$;

-- Participants can see contact details of the other party on their own orders.
create policy "profiles order contact" on public.profiles for select to authenticated
using (exists (select 1 from public.orders o where
  (o.customer_id = auth.uid() and o.master_id = profiles.id) or
  (o.master_id = auth.uid() and o.customer_id = profiles.id)));

alter table public.order_quotes enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_reads enable row level security;
revoke all on public.order_quotes, public.conversations, public.messages, public.conversation_reads from anon, authenticated;
grant select on public.order_quotes, public.conversations, public.messages, public.conversation_reads to authenticated;
grant all on public.order_quotes, public.conversations, public.messages, public.conversation_reads to service_role;
create policy "quotes participants" on public.order_quotes for select to authenticated using (public.can_access_order(order_id));

create function public.can_access_conversation(p_conversation uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (select 1 from public.conversations c where c.id = p_conversation
    and (public.is_admin() or (c.kind = 'support' and c.owner_id = auth.uid())
      or (c.kind = 'order' and public.can_access_order(c.order_id))));
$$;
create policy "conversation participants" on public.conversations for select to authenticated using (public.can_access_conversation(id));
create policy "message participants" on public.messages for select to authenticated using (public.can_access_conversation(conversation_id));
create policy "own read markers" on public.conversation_reads for select to authenticated using (profile_id = auth.uid());

create function public.create_order(p_service integer, p_description text, p_address text, p_city text, p_preferred timestamptz default null, p_request uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_service public.services;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'customer') then raise exception 'Objednávku môže vytvoriť iba zákazník.'; end if;
  perform 1 from public.profiles where id = auth.uid() for update;
  if p_request is not null then
    select id into v_id from public.orders where customer_id = auth.uid() and client_request_id = p_request;
    if found then return v_id; end if;
  end if;
  if char_length(btrim(p_description)) not between 10 and 4000 or char_length(btrim(p_address)) not between 5 and 300 or char_length(btrim(p_city)) not between 2 and 100
    or p_description is null or p_address is null or p_city is null then raise exception 'Skontrolujte popis a adresu.'; end if;
  if p_preferred is not null and p_preferred <= now() then raise exception 'Vyberte termín v budúcnosti.'; end if;
  select * into v_service from public.services where id = p_service and active;
  if not found then raise exception 'Služba nie je dostupná.'; end if;
  insert into public.orders(order_number, customer_id, service_id, problem_description, address, city, preferred_datetime, estimated_price, estimated_price_max, client_request_id)
  values ('FL-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), auth.uid(), p_service, btrim(p_description), btrim(p_address), btrim(p_city), p_preferred, v_service.base_price, v_service.estimate_max, p_request)
  returning id into v_id;
  return v_id;
end $$;

create function public.assign_master(p_order uuid, p_master uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_order public.orders;
begin
  if not public.is_admin() then raise exception 'Prístup je povolený iba administrátorovi.'; end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found or v_order.status not in ('new','assigned') then raise exception 'Majstra už nemožno zmeniť v tomto stave objednávky.'; end if;
  if not exists (select 1 from public.masters m join public.profiles p on p.id = m.profile_id where m.profile_id = p_master and m.verified and m.available and p.role = 'master')
    then raise exception 'Vyberte overeného a dostupného majstra.'; end if;
  update public.orders set master_id = p_master, status = 'assigned' where id = p_order;
  insert into public.conversations(kind, order_id, subject) values ('order', p_order, v_order.order_number)
    on conflict (order_id) where kind = 'order' do nothing;
end $$;

create function public.verify_master(p_master uuid, p_verified boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Prístup je povolený iba administrátorovi.'; end if;
  update public.masters set verified = p_verified where profile_id = p_master;
  if not found then raise exception 'Majster sa nenašiel.'; end if;
end $$;

create function public.respond_to_order(p_order uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order for update;
  if not found or auth.uid() is null or v_order.master_id is distinct from auth.uid() or v_order.status <> 'assigned' then raise exception 'Objednávku nemožno prijať ani odmietnuť.'; end if;
  if p_accept and not exists (select 1 from public.masters where profile_id = auth.uid() and verified) then raise exception 'Váš profil musí overiť administrátor.'; end if;
  update public.orders set status = case when p_accept then 'accepted'::public.order_status else 'new'::public.order_status end,
    master_id = case when p_accept then master_id else null end where id = p_order;
end $$;

-- Internal helper: trusted order actions may add timeline events; clients cannot spoof them.
create function public.post_order_event(p_order uuid, p_body text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_conversation uuid; v_profile public.profiles;
begin
  select id into v_conversation from public.conversations where order_id = p_order and kind = 'order';
  select * into v_profile from public.profiles where id = auth.uid();
  if v_conversation is null or v_profile.id is null then return; end if;
  insert into public.messages(conversation_id,sender_id,sender_name,sender_role,body,client_id,is_system)
    values(v_conversation,v_profile.id,v_profile.full_name,v_profile.role,p_body,gen_random_uuid(),true);
  update public.conversations set updated_at = now() where id = v_conversation;
end $$;

create function public.propose_quote(p_order uuid, p_scope text, p_labor integer, p_materials integer, p_travel integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_order public.orders; v_kind text; v_id uuid;
begin
  select * into v_order from public.orders where id = p_order for update;
  if not found or auth.uid() is null or (v_order.master_id is distinct from auth.uid() and not public.is_admin()) then raise exception 'K objednávke nemáte prístup.'; end if;
  if v_order.status not in ('accepted','in_progress') then raise exception 'Cenu možno navrhnúť po prijatí zákazky.'; end if;
  if exists (select 1 from public.payments where order_id = p_order and status = 'pending') then raise exception 'Najprv je potrebné uhradiť už schválenú ponuku.'; end if;
  v_kind := case when v_order.status = 'in_progress' then 'extra' else 'initial' end;
  if v_kind = 'initial' and exists (select 1 from public.order_quotes where order_id = p_order and kind = 'initial' and status = 'accepted') then raise exception 'Základná ponuka je už schválená.'; end if;
  if p_scope is null or char_length(btrim(p_scope)) not between 10 and 4000 or p_labor is null or p_materials is null or p_travel is null
    or least(p_labor,p_materials,p_travel) < 0 or p_labor::bigint + p_materials + p_travel not between 50 and 10000000 then raise exception 'Zadajte rozsah prác a platné ceny.'; end if;
  update public.order_quotes set status = 'superseded' where order_id = p_order and status = 'proposed';
  insert into public.order_quotes(order_id,created_by,kind,scope,labor_amount,materials_amount,travel_amount)
    values(p_order,auth.uid(),v_kind,btrim(p_scope),p_labor,p_materials,p_travel) returning id into v_id;
  perform public.post_order_event(p_order,case when v_kind = 'extra' then 'Nová ponuka na práce navyše: ' else 'Nová cenová ponuka: ' end || replace(round((p_labor::numeric + p_materials + p_travel)/100,2)::text,'.',',') || ' €. Rozsah a schválenie nájdete v detaile objednávky.');
  return v_id;
end $$;

create function public.withdraw_quote(p_quote uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_order public.orders; v_order_id uuid;
begin
  select order_id into v_order_id from public.order_quotes where id = p_quote;
  select * into v_order from public.orders where id = v_order_id for update;
  if v_order.id is null or auth.uid() is null or (v_order.master_id is distinct from auth.uid() and not public.is_admin()) then raise exception 'K ponuke nemáte prístup.'; end if;
  update public.order_quotes set status = 'superseded' where id = p_quote and status = 'proposed';
  if not found then raise exception 'Stiahnuť možno iba neschválenú ponuku.'; end if;
  perform public.post_order_event(v_order.id,'Cenová ponuka bola stiahnutá.');
end $$;

create function public.respond_to_quote(p_quote uuid, p_accept boolean, p_note text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare v_quote public.order_quotes; v_order public.orders; v_order_id uuid;
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
    insert into public.payments(order_id,quote_id,amount,commission_amount,master_amount)
      values(v_order.id,v_quote.id,v_quote.total_amount,round(v_quote.total_amount * 0.20),v_quote.total_amount - round(v_quote.total_amount * 0.20));
    update public.orders set final_price = coalesce((select sum(total_amount) from public.order_quotes where order_id = v_order.id and status = 'accepted'),0)
      + coalesce((select sum(amount) from public.payments where order_id = v_order.id and quote_id is null and status in ('paid','refunded')),0)
      where id = v_order.id;
  end if;
end $$;

create function public.cancel_order(p_order uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order for update;
  if not found or auth.uid() is null or (v_order.customer_id is distinct from auth.uid() and not public.is_admin()) then raise exception 'K objednávke nemáte prístup.'; end if;
  if v_order.status not in ('new','assigned','accepted') or exists(select 1 from public.payments where order_id = p_order) then raise exception 'Po schválení platby riešte zrušenie cez podporu.'; end if;
  update public.order_quotes set status = 'superseded' where order_id = p_order and status = 'proposed';
  update public.orders set status = 'cancelled' where id = p_order;
end $$;

create function public.complete_order(p_order uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order for update;
  if not found or auth.uid() is null or v_order.master_id is distinct from auth.uid() or v_order.status <> 'in_progress' then raise exception 'Objednávku nemožno dokončiť.'; end if;
  if exists(select 1 from public.order_quotes where order_id = p_order and status = 'proposed')
    or exists(select 1 from public.payments where order_id = p_order and status = 'pending')
    or not exists(select 1 from public.payments where order_id = p_order and status = 'paid')
    then raise exception 'Najprv vyriešte všetky ponuky a platby.'; end if;
  update public.orders set status = 'completed', completed_at = now(),
    final_price = (select sum(amount) from public.payments where order_id = p_order and status in ('paid','refunded')),
    commission_amount = (select sum(commission_amount) from public.payments where order_id = p_order and status in ('paid','refunded'))
    where id = p_order;
end $$;

-- Reserve a stable checkout attempt under a row lock. New attempts require Stripe expiry.
create function public.prepare_checkout(p_payment uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_payment public.payments; v_order public.orders; v_order_id uuid;
begin
  select order_id into v_order_id from public.payments where id = p_payment;
  select * into v_order from public.orders where id = v_order_id for update;
  select * into v_payment from public.payments where id = p_payment for update;
  if v_payment.id is null or auth.uid() is null or v_order.customer_id is distinct from auth.uid() then raise exception 'Platba sa nenašla.'; end if;
  if v_order.status not in ('accepted','in_progress') or v_payment.status <> 'pending' or v_payment.quote_id is null then raise exception 'Túto platbu nemožno spustiť.'; end if;
  if not exists(select 1 from public.order_quotes where id = v_payment.quote_id and status = 'accepted') then raise exception 'Ponuka ešte nie je schválená.'; end if;
  update public.payments set attempt_started_at = coalesce(attempt_started_at, now()) where id = p_payment returning * into v_payment;
  return to_jsonb(v_payment);
end $$;

create function public.attach_checkout(p_payment uuid, p_attempt integer, p_session text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.payments set stripe_checkout_session_id = p_session where id = p_payment and checkout_attempt = p_attempt
    and (stripe_checkout_session_id is null or stripe_checkout_session_id = p_session);
  if not found then raise exception 'Platobná relácia sa medzičasom zmenila.'; end if;
end $$;

create function public.reset_checkout(p_payment uuid, p_attempt integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.payments set stripe_checkout_session_id = null, checkout_attempt = checkout_attempt + 1, attempt_started_at = null
    where id = p_payment and checkout_attempt = p_attempt and status = 'pending';
end $$;

create function public.settle_checkout(p_payment uuid, p_attempt integer, p_session text, p_intent text, p_amount integer, p_currency text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_payment public.payments; v_order public.orders; v_order_id uuid;
begin
  select order_id into v_order_id from public.payments where id = p_payment;
  select * into v_order from public.orders where id = v_order_id for update;
  select * into v_payment from public.payments where id = p_payment for update;
  if v_payment.id is null or p_currency is distinct from 'eur' or p_amount is distinct from v_payment.amount or p_intent is null
    or p_session is null or p_attempt is distinct from v_payment.checkout_attempt
    or (v_payment.stripe_checkout_session_id is not null and v_payment.stripe_checkout_session_id <> p_session) then raise exception 'Údaje platby sa nezhodujú s ponukou.'; end if;
  if v_payment.status in ('paid','refunded') then return v_order.id; end if;
  if v_order.status not in ('accepted','in_progress') then raise exception 'Objednávka nie je v stave na úhradu.'; end if;
  update public.payments set status = 'paid', stripe_checkout_session_id = p_session, stripe_payment_intent_id = p_intent where id = p_payment;
  update public.orders set status = case when status = 'accepted' then 'in_progress'::public.order_status else status end,
    stripe_payment_status = case when exists(select 1 from public.payments where order_id = v_order.id and refunded_amount > 0) then 'partially_refunded' else 'paid' end,
    commission_amount = (select sum(commission_amount) from public.payments where order_id = v_order.id and status in ('paid','refunded'))
    where id = v_order.id;
  return v_order.id;
end $$;

create function public.record_refund(p_intent text, p_refunded integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_payment public.payments; v_refunded bigint; v_total bigint; v_order_id uuid;
begin
  select order_id into v_order_id from public.payments where stripe_payment_intent_id = p_intent;
  perform 1 from public.orders where id = v_order_id for update;
  select * into v_payment from public.payments where stripe_payment_intent_id = p_intent for update;
  if not found then raise exception 'Platba sa ešte nesynchronizovala.'; end if;
  if p_refunded < 0 or p_refunded > v_payment.amount then raise exception 'Neplatná suma vrátenia.'; end if;
  update public.payments set refunded_amount = greatest(refunded_amount, p_refunded),
    status = case when greatest(refunded_amount, p_refunded) = amount then 'refunded'::public.payment_status else status end where id = v_payment.id;
  select sum(refunded_amount), sum(amount) into v_refunded, v_total from public.payments where order_id = v_payment.order_id and status in ('paid','refunded');
  update public.orders set stripe_payment_status = case when v_refunded = v_total then 'refunded' when v_refunded > 0 then 'partially_refunded' else 'paid' end where id = v_payment.order_id;
end $$;

create function public.send_message(p_conversation uuid, p_body text, p_client uuid)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_conversation public.conversations; v_profile public.profiles; v_id bigint;
begin
  if not public.can_access_conversation(p_conversation) then raise exception 'Ku konverzácii nemáte prístup.'; end if;
  select * into v_conversation from public.conversations where id = p_conversation for update;
  select id into v_id from public.messages where sender_id = auth.uid() and client_id = p_client and conversation_id = p_conversation;
  if found then return v_id; end if;
  if v_conversation.status <> 'open' then raise exception 'Konverzácia je uzavretá. Najprv ju znovu otvorte.'; end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 4000 then raise exception 'Správa musí mať 1 až 4 000 znakov.'; end if;
  select * into v_profile from public.profiles where id = auth.uid() for update;
  if (select count(*) from public.messages where sender_id = auth.uid() and created_at > now() - interval '1 minute') >= 30 then raise exception 'Odosielate príliš rýchlo. Skúste to o minútu.'; end if;
  insert into public.messages(conversation_id,sender_id,sender_name,sender_role,body,client_id)
    values(p_conversation,auth.uid(),v_profile.full_name,v_profile.role,btrim(p_body),p_client) returning id into v_id;
  update public.conversations set updated_at = now() where id = p_conversation;
  return v_id;
end $$;

create function public.create_support(p_subject text, p_body text, p_client uuid, p_order uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Prihláste sa.'; end if;
  -- The profile lock also serializes duplicate submissions and support rate limits.
  perform 1 from public.profiles where id = auth.uid() for update;
  select conversation_id into v_id from public.messages where sender_id = auth.uid() and client_id = p_client;
  if found then return v_id; end if;
  if p_order is not null and not public.can_access_order(p_order) then raise exception 'Objednávka sa nenašla.'; end if;
  if (select count(*) from public.conversations where owner_id = auth.uid() and kind = 'support' and created_at > now() - interval '1 hour') >= 10 then raise exception 'Ďalší podnet môžete vytvoriť neskôr.'; end if;
  if p_subject is null or char_length(btrim(p_subject)) not between 3 and 160 then raise exception 'Predmet musí mať 3 až 160 znakov.'; end if;
  insert into public.conversations(kind,owner_id,order_id,subject) values('support',auth.uid(),p_order,btrim(p_subject)) returning id into v_id;
  perform public.send_message(v_id,p_body,p_client);
  return v_id;
end $$;

create function public.mark_conversation_read(p_conversation uuid, p_message bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_access_conversation(p_conversation) then raise exception 'Ku konverzácii nemáte prístup.'; end if;
  if not exists(select 1 from public.messages where id = p_message and conversation_id = p_conversation) then return; end if;
  insert into public.conversation_reads values(p_conversation,auth.uid(),p_message)
    on conflict (conversation_id,profile_id) do update set last_message_id = greatest(public.conversation_reads.last_message_id,excluded.last_message_id);
end $$;

create function public.set_support_status(p_conversation uuid, p_closed boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_access_conversation(p_conversation) then raise exception 'Ku konverzácii nemáte prístup.'; end if;
  update public.conversations set status = case when p_closed then 'closed' else 'open' end, updated_at = now()
    where id = p_conversation and kind = 'support';
  if not found then raise exception 'Uzavrieť možno iba podnet podpory.'; end if;
end $$;

create function public.message_inbox()
returns table(id uuid, kind text, order_id uuid, subject text, status text, updated_at timestamptz, last_body text, unread_count bigint)
language sql stable security invoker set search_path = '' as $$
  select c.id,c.kind,c.order_id,c.subject,c.status,c.updated_at,
    (select m.body from public.messages m where m.conversation_id = c.id order by m.id desc limit 1),
    (select count(*) from public.messages m where m.conversation_id = c.id and m.sender_id <> auth.uid() and m.id > coalesce(r.last_message_id,0))
  from public.conversations c left join public.conversation_reads r on r.conversation_id = c.id and r.profile_id = auth.uid()
  order by c.updated_at desc;
$$;

create function public.unread_message_count()
returns bigint language sql stable security invoker set search_path = '' as $$
  select count(*) from public.messages m left join public.conversation_reads r
    on r.conversation_id = m.conversation_id and r.profile_id = auth.uid()
  where m.sender_id <> auth.uid() and m.id > coalesce(r.last_message_id,0);
$$;

-- Photos of homes are private. Old public URLs are converted to bucket paths in place.
update storage.buckets set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'] where id = 'order-photos';
update public.order_photos set photo_url = split_part(photo_url,'/storage/v1/object/public/order-photos/',2)
  where photo_url like '%/storage/v1/object/public/order-photos/%';
drop policy "order photos public read" on storage.objects;
drop policy "order photos owner upload" on storage.objects;
create policy "private order photos read" on storage.objects for select to authenticated
using (bucket_id = 'order-photos' and exists (select 1 from public.orders o where o.id::text = (storage.foldername(name))[2]
  and o.customer_id::text = (storage.foldername(name))[1] and public.can_access_order(o.id)));
create function public.can_upload_photo(p_name text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_order uuid;
begin
  if auth.uid() is null or (storage.foldername(p_name))[1] <> auth.uid()::text then return false; end if;
  select id into v_order from public.orders where id::text = (storage.foldername(p_name))[2]
    and customer_id = auth.uid() and status in ('new','assigned','accepted','in_progress') for update;
  if not found then return false; end if;
  return (select count(*) from storage.objects where bucket_id = 'order-photos'
    and (storage.foldername(name))[2] = v_order::text) < 5;
end $$;
create policy "private order photos upload" on storage.objects for insert to authenticated
with check (bucket_id = 'order-photos' and public.can_upload_photo(name));
revoke insert, update, delete on public.order_photos from anon, authenticated;
drop policy "order photos customer insert" on public.order_photos;
create function public.attach_order_photo(p_order uuid, p_path text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.orders where id = p_order and customer_id = auth.uid()
    and status in ('new','assigned','accepted','in_progress') for update;
  if not found or p_path is null or p_path not like auth.uid()::text || '/' || p_order::text || '/%'
    then raise exception 'Fotografiu nemožno pridať k tejto objednávke.'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'order-photos' and name = p_path)
    then raise exception 'Fotografia ešte nebola nahratá.'; end if;
  if exists (select 1 from public.order_photos where order_id = p_order and photo_url = p_path) then return; end if;
  if (select count(*) from public.order_photos where order_id = p_order) >= 5 then raise exception 'K objednávke možno pridať najviac 5 fotografií.'; end if;
  insert into public.order_photos(order_id,photo_url) values(p_order,p_path);
end $$;

-- Ratings cannot target an unrelated professional. Recompute using all ratings, not the customer's RLS subset.
drop policy "ratings customer insert" on public.ratings;
create policy "ratings customer insert" on public.ratings for insert to authenticated
with check (customer_id = auth.uid() and exists(select 1 from public.orders o where o.id = order_id
  and o.customer_id = auth.uid() and o.master_id = ratings.master_id and o.status = 'completed'));
create function public.refresh_rating() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.masters set rating_avg = (select round(avg(stars),2) from public.ratings where master_id = new.master_id) where profile_id = new.master_id;
  return new;
end $$;
create trigger rating_added after insert on public.ratings for each row execute function public.refresh_rating();

-- Existing assigned orders receive their own conversation. Legacy payments remain visible.
insert into public.conversations(kind,order_id,subject)
select 'order',id,order_number from public.orders where master_id is not null;
update public.services set name = 'Elektrikár', description = 'Elektroinštalácie, zásuvky, osvetlenie a drobné opravy.' where name = 'Electrician' and not exists(select 1 from public.services where name = 'Elektrikár');
update public.services set name = 'Inštalatér', description = 'Úniky vody, batérie, odpady a drobné inštalatérske práce.' where name = 'Plumber' and not exists(select 1 from public.services where name = 'Inštalatér');
update public.profiles set city = 'Košice' where city = 'Kosice';
update public.orders set city = 'Košice' where city = 'Kosice';

-- Explicitly scope every new privileged function. Webhook-only functions are NEVER callable by browser roles.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('can_access_order','can_access_conversation','can_upload_photo','attach_order_photo','create_order','assign_master','verify_master','respond_to_order','propose_quote','withdraw_quote','respond_to_quote','cancel_order','complete_order','prepare_checkout','attach_checkout','reset_checkout','settle_checkout','record_refund','send_message','create_support','mark_conversation_read','set_support_status','message_inbox','unread_message_count','refresh_rating','post_order_event') loop
    execute 'revoke all on function ' || f.signature || ' from public, anon, authenticated';
    execute 'grant execute on function ' || f.signature || ' to service_role';
  end loop;
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('can_access_order','can_access_conversation','can_upload_photo','attach_order_photo','create_order','assign_master','verify_master','respond_to_order','propose_quote','withdraw_quote','respond_to_quote','cancel_order','complete_order','prepare_checkout','send_message','create_support','mark_conversation_read','set_support_status','message_inbox','unread_message_count') loop
    execute 'grant execute on function ' || f.signature || ' to authenticated';
  end loop;
end $$;
commit;
