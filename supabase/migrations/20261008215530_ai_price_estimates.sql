begin;

-- AI previews are informational. They never create quotes, payments or commissions.
create table public.ai_estimates (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  service_id integer not null references public.services(id),
  problem_description text not null check (char_length(problem_description) between 10 and 4000),
  city text not null check (char_length(city) between 2 and 100),
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  photo_count integer not null check (photo_count between 0 and 5),
  status text not null default 'pending' check (status in ('pending','completed','failed')),
  result jsonb,
  model text,
  created_at timestamptz not null default now(),
  check (status <> 'completed' or (
    result is not null and jsonb_typeof(result) = 'object' and
    coalesce(result->>'kind' in ('range','inspection'), false) and model is not null
  ))
);
create index ai_estimates_customer_created_idx on public.ai_estimates(customer_id, created_at desc);
create index ai_estimates_service_idx on public.ai_estimates(service_id);
alter table public.orders add column ai_estimate_id uuid references public.ai_estimates(id) on delete set null;
create index orders_ai_estimate_idx on public.orders(ai_estimate_id) where ai_estimate_id is not null;

alter table public.ai_estimates enable row level security;
revoke all on public.ai_estimates from public, anon, authenticated;
grant select on public.ai_estimates to authenticated;
grant all on public.ai_estimates to service_role;
create policy "ai estimate participants" on public.ai_estimates for select to authenticated using (
  customer_id = (select auth.uid()) or public.is_admin() or exists (
    select 1 from public.orders o where o.ai_estimate_id = ai_estimates.id and o.master_id = (select auth.uid())
  )
);

-- Lock the customer profile to enforce limits across concurrent/serverless requests.
-- Authenticated callers may reserve a slot, but can never write a model result.
create function public.reserve_ai_estimate(p_service integer, p_description text, p_city text, p_fingerprint text, p_photo_count integer)
returns public.ai_estimates language plpgsql security definer set search_path = '' as $$
declare v_estimate public.ai_estimates;
begin
  perform 1 from public.profiles where id = auth.uid() and role = 'customer' for update;
  if not found then raise exception 'AI odhad môže vyžiadať iba zákazník.'; end if;
  if p_description is null or char_length(btrim(p_description)) not between 10 and 4000 or
     p_city is null or char_length(btrim(p_city)) not between 2 and 100 or
     p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$' or
     p_photo_count is null or p_photo_count not between 0 and 5 then
    raise exception 'Skontrolujte údaje pre AI odhad.';
  end if;
  if not exists (select 1 from public.services where id = p_service and active) then raise exception 'Služba nie je dostupná.'; end if;
  select * into v_estimate from public.ai_estimates where customer_id = auth.uid() and
    fingerprint = p_fingerprint and service_id = p_service and problem_description = btrim(p_description) and city = btrim(p_city) and photo_count = p_photo_count and
    status = 'completed' and created_at > now() - interval '24 hours' order by created_at desc limit 1;
  if found then return v_estimate; end if;
  if exists (select 1 from public.ai_estimates where customer_id = auth.uid() and created_at > now() - interval '60 seconds') then
    raise exception 'Pred ďalším AI odhadom počkajte jednu minútu.';
  end if;
  if (select count(*) from public.ai_estimates where customer_id = auth.uid() and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'Dnes ste využili 10 AI odhadov. Objednávku môžete odoslať aj bez odhadu.';
  end if;
  -- Unsubmitted descriptions are short-lived; estimates attached to orders remain.
  delete from public.ai_estimates e where e.customer_id = auth.uid() and e.created_at < now() - interval '7 days'
    and not exists (select 1 from public.orders o where o.ai_estimate_id = e.id);
  insert into public.ai_estimates(customer_id, service_id, problem_description, city, fingerprint, photo_count)
    values (auth.uid(), p_service, btrim(p_description), btrim(p_city), p_fingerprint, p_photo_count) returning * into v_estimate;
  return v_estimate;
end $$;

create function public.create_order_with_ai(p_service integer, p_description text, p_address text, p_city text,
  p_preferred timestamptz default null, p_request uuid default null, p_estimate uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_estimate public.ai_estimates; v_min integer; v_max integer;
begin
  perform 1 from public.profiles where id = auth.uid() and role = 'customer' for update;
  if not found then raise exception 'Objednávku môže vytvoriť iba zákazník.'; end if;
  if p_request is not null then
    select id into v_id from public.orders where customer_id = auth.uid() and client_request_id = p_request;
    if found then return v_id; end if;
  end if;
  if p_estimate is null then return public.create_order(p_service, p_description, p_address, p_city, p_preferred, p_request); end if;
  select * into v_estimate from public.ai_estimates where id = p_estimate and customer_id = auth.uid() and
    status = 'completed' and created_at > now() - interval '24 hours' and service_id = p_service and
    problem_description = btrim(p_description) and city = btrim(p_city);
  if not found then raise exception 'AI odhad už nezodpovedá objednávke. Obnovte ho alebo pokračujte bez odhadu.'; end if;
  if v_estimate.result->>'kind' = 'range' then
    v_min := (v_estimate.result->'total'->>'min')::integer;
    v_max := (v_estimate.result->'total'->>'max')::integer;
    if v_min is null or v_max is null or v_min < 0 or v_max <= 0 or v_max < v_min or v_max > 10000000 then
      raise exception 'AI odhad sa nepodarilo overiť. Pokračujte bez odhadu.';
    end if;
  end if;
  v_id := public.create_order(p_service, p_description, p_address, p_city, p_preferred, p_request);
  update public.orders set ai_estimate_id = p_estimate, estimated_price = v_min, estimated_price_max = v_max where id = v_id;
  return v_id;
end $$;

revoke all on function public.reserve_ai_estimate(integer,text,text,text,integer) from public, anon, authenticated;
revoke all on function public.create_order_with_ai(integer,text,text,text,timestamptz,uuid,uuid) from public, anon, authenticated;
grant execute on function public.reserve_ai_estimate(integer,text,text,text,integer) to authenticated;
grant execute on function public.create_order_with_ai(integer,text,text,text,timestamptz,uuid,uuid) to authenticated;

commit;
