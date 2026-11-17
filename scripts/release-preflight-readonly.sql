-- FixLook: produkčný preflight bez modifikácie dát
-- Vykonávať výhradne READ-ONLY cez Supabase SQL Editor.
-- Výsledky môžu obsahovať prevádzkové metadáta, nie sú určené na verejné zverejnenie.
-- Bez autorizačného súhlasu NEVYKONÁVAŤ migrácie, UPDATE, DELETE ani backfill.
begin read only;

select now() as checked_at_utc, current_database() as database_name,
       to_regclass('public.order_schedules') is not null as schedules_available,
       to_regclass('public.platform_commission_settings') is not null as commission_settings_available;

select (select count(*) from public.orders) as orders,
       (select count(*) from public.order_quotes) as quotes,
       (select count(*) from public.payments) as payments,
       (select count(*) from public.profiles where role = 'admin') as admin_profiles,
       (select count(*) from public.order_quotes where status = 'proposed') as open_quotes,
       (select count(*) from public.payments where status = 'pending') as pending_payments;

-- Oddeľuje syntetické TEST objednávky od ostatných živých prípadov.
select o.order_number,
       o.status as order_status,
       o.problem_description like 'TEST – NEVYKONÁVAŤ:%' as marked_test,
       q.status as quote_status,
       q.total_amount as quoted_cents,
       q.labor_amount as labor_cents,
       p.status as payment_status,
       p.amount as payment_cents,
       p.commission_amount as stored_commission_cents
  from public.orders o
  left join public.order_quotes q on q.order_id=o.id and q.status='proposed'
  left join public.payments p on p.order_id=o.id and p.status='pending'
 where q.id is not null or p.id is not null
 order by o.created_at desc;

-- Identifikačný test, ktorý nepíše do DB ani nezverejňuje celé definície funkcií.
select p.proname,
       position('labor_amount::numeric * v_rate' in pg_get_functiondef(p.oid)) > 0 as labor_only_rule_detected,
       position('total_amount * 0.20' in pg_get_functiondef(p.oid)) > 0 as legacy_total_20pct_detected
  from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
 where ns.nspname='public' and p.proname='respond_to_quote';

-- Plánované migrácie je potrebné spárovať s názvami aj verziami v produkcii.
select version, name
  from supabase_migrations.schema_migrations
 order by version;

commit;
