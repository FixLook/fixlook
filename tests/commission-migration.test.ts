import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const customer = "10000000-0000-4000-8000-000000000001";
const master = "10000000-0000-4000-8000-000000000002";
const admin = "10000000-0000-4000-8000-000000000003";

test("FixLook commission applies to labor only and requires explicit configuration", async t => {
  const db = new PGlite({ extensions: { pgcrypto } });
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid() primary key, bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]
    $$;
    grant usage on schema public,auth,storage to anon,authenticated,service_role;
    grant all on storage.objects to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
  `);
  for (const migration of [
    "supabase/migrations/001_init.sql",
    "supabase/migrations/002_quotes_messages_security.sql",
    "supabase/migrations/20261008215530_ai_price_estimates.sql",
    "supabase/migrations/20261114092802_commission_from_labor.sql"
  ]) {
    await db.exec(await readFile(migration, "utf8"));
  }
  for (const [id, role, name] of [
    [customer, "customer", "Zákazník"],
    [master, "master", "Majster"],
    [admin, "customer", "Admin"]
  ]) {
    await db.query("insert into auth.users values ($1,$2,$3)", [
      id, `${id}@example.test`, JSON.stringify({ role, full_name: name })
    ]);
  }
  await db.query("update public.profiles set role='admin' where id=$1", [admin]);
  await db.query("update public.masters set available=true,verified=true where profile_id=$1", [master]);
  await db.exec("insert into public.services(name,base_price,estimate_max) values('Elektrikár',8000,15000)");

  async function as<T>(id: string, sql: string, params: unknown[] = []): Promise<T[]> {
    await db.exec("begin");
    try {
      await db.exec("set local role authenticated");
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id]);
      const result = await db.query<T>(sql, params);
      await db.exec("commit");
      return result.rows;
    } catch (error) {
      await db.exec("rollback");
      throw error;
    }
  }
  async function priceQuote(labor: number, materials: number, travel: number) {
    const result = await as<{ value: string }>(
      master, "select public.propose_quote($1,$2,$3,$4,$5) as value",
      [orderId, "Výmena elektrickej zásuvky", labor, materials, travel]
    );
    return result[0].value;
  }

  const orderId = (await as<{ value: string }>(
    customer, "select public.create_order(1,'Nefunkčná zásuvka','Hlavná 10','Košice') as value"
  ))[0].value;
  await as(admin, "select public.assign_master($1,$2)", [orderId, master]);
  await as(master, "select public.respond_to_order($1,true)", [orderId]);

  await t.test("unconfigured rate rejects approval without creating payment", async () => {
    await db.exec("delete from public.platform_commission_settings");
    const quote = await priceQuote(10000, 4000, 1000);
    await assert.rejects(
      as(customer, "select public.respond_to_quote($1,true)", [quote]),
      /Provízia FixLook nie je nastavená/
    );
    const result = await db.query<{ status: string }>("select status from public.order_quotes where id=$1", [quote]);
    assert.equal(result.rows[0].status, "proposed");
    const payments = await db.query<{ count: number }>("select count(*)::int as count from public.payments where order_id=$1", [orderId]);
    assert.equal(payments.rows[0].count, 0);
  });

  await t.test("approved 15% on labor, excluding materials and travel", async () => {
    await db.exec("insert into public.platform_commission_settings(singleton,commission_rate_bps) values(true,1500)");
    const quote = (await db.query<{ id: string }>("select id from public.order_quotes where order_id=$1 and status='proposed'", [orderId])).rows[0].id;
    await as(customer, "select public.respond_to_quote($1,true)", [quote]);
    const payment = (await db.query<{ amount: number; commission_amount: number; master_amount: number }>(
      "select amount,commission_amount,master_amount from public.payments where quote_id=$1", [quote]
    )).rows[0];
    assert.deepEqual(payment, { amount: 15000, commission_amount: 1500, master_amount: 13500 });
  });
  await t.test("only trusted operator can change the rate", async () => {
    await assert.rejects(
      as(customer, "update public.platform_commission_settings set commission_rate_bps=5000"),
      /permission denied/
    );
  });
  await t.test("15% on labor-only for explicitly approved additional work", async () => {
    // The second proposal requires an in-progress order; simulate the already
    // settled first payment through the trusted server RPC.
    const payment = (await db.query<{ id: string }>(
      "select id from public.payments where order_id=$1", [orderId]
    )).rows[0];
    await as(customer, "select public.prepare_checkout($1)", [payment.id]);
    await db.query("select public.attach_checkout($1,0,'cs_test_1')", [payment.id]);
    await db.query("select public.settle_checkout($1,0,'cs_test_1','pi_test_1',15000,'eur')", [payment.id]);
    const quote = await priceQuote(2000, 5000, 500);
    await as(customer, "select public.respond_to_quote($1,true)", [quote]);
    const extra = (await db.query<{ amount: number; commission_amount: number; master_amount: number }>(
      "select amount,commission_amount,master_amount from public.payments where quote_id=$1", [quote]
    )).rows[0];
    assert.deepEqual(extra, { amount: 7500, commission_amount: 300, master_amount: 7200 });
  });
});
