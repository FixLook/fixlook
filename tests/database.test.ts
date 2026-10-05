import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const customer = "10000000-0000-4000-8000-000000000001";
const master = "10000000-0000-4000-8000-000000000002";
const admin = "10000000-0000-4000-8000-000000000003";
const stranger = "10000000-0000-4000-8000-000000000004";
const unverified = "10000000-0000-4000-8000-000000000005";

test("PostgreSQL: quotes, payments, permissions and private conversations", async t => {
  const db = new PGlite({ extensions: { pgcrypto } });
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid() primary key, bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
    grant usage on schema public,auth,storage to anon,authenticated,service_role;
    grant all on storage.objects to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
  `);
  await db.exec(await readFile("supabase/migrations/001_init.sql", "utf8"));
  // Reproduce the extra permissive policy discovered on the hosted MVP.
  await db.exec('create policy "Allow all users to read profiles" on public.profiles for select using (true)');
  await db.exec(await readFile("supabase/migrations/002_quotes_messages_security.sql", "utf8"));
  for (const [id, role, name] of [[customer,"customer","Zákazník"],[master,"master","Majster"],[admin,"customer","Administrátor"],[stranger,"customer","Cudzí zákazník"],[unverified,"master","Neoverený majster"]]) {
    await db.query("insert into auth.users values ($1,$2,$3)", [id, `${id}@example.test`, JSON.stringify({ role, full_name: name })]);
  }
  await db.query("update public.profiles set role='admin' where id=$1", [admin]);
  await db.query("update public.masters set available=true where profile_id=$1", [master]);
  await db.exec("insert into public.services(name,base_price,estimate_max) values('Elektrikár',8000,15000)");

  async function as<T>(id: string | null, sql: string, params: unknown[] = [], role = "authenticated"): Promise<T[]> {
    await db.exec("begin");
    try {
      await db.exec(`set local role ${role}`);
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id ?? ""]);
      const result = await db.query<T>(sql, params);
      await db.exec("commit");
      return result.rows;
    } catch (error) { await db.exec("rollback"); throw error; }
  }
  async function scalar<T>(id: string | null, sql: string, params: unknown[] = [], role = "authenticated") {
    return (await as<{ value: T }>(id, sql, params, role))[0]?.value;
  }
  await t.test("roles, verification and payment fields cannot be forged", async () => {
    assert.equal((await as(null, "select * from public.profiles", [], "anon")).length, 0);
    assert.equal((await as(stranger, "select * from public.profiles where id=$1", [customer])).length, 0);
    await assert.rejects(as(null, "select public.handle_new_user()", [], "anon"), /permission denied/);
    await assert.rejects(as(customer, "update public.profiles set role='admin' where id=$1", [customer]), /permission denied/);
    await assert.rejects(as(master, "update public.masters set verified=true where profile_id=$1", [master]), /permission denied/);
    await assert.rejects(as(customer, "insert into public.profiles(id,full_name,email,role) values(gen_random_uuid(),'Fake','fake@test','admin')"), /permission denied/);
    await assert.rejects(as(customer, "select public.verify_master($1,true)", [master]), /administrátor/);
    await as(customer, "update public.profiles set full_name='Nové meno' where id=$1", [customer]);
    await as(master, "update public.masters set description='Skúsený elektrikár' where profile_id=$1", [master]);
    await assert.rejects(as(null, "select public.create_order(1,'Nefunguje zásuvka','Hlavná 10','Košice')", [], "anon"), /permission denied/);
  });
  await t.test("retrying an order request does not create duplicate orders", async () => {
    const request = crypto.randomUUID();
    const first = await scalar<string>(customer,"select public.create_order(1,'Test opakovanej požiadavky','Hlavná 10','Košice',null,$1) as value",[request]);
    const second = await scalar<string>(customer,"select public.create_order(1,'Test opakovanej požiadavky','Hlavná 10','Košice',null,$1) as value",[request]);
    assert.equal(first,second);
  });
  const order = await scalar<string>(customer, "select public.create_order(1,'Nefunguje zásuvka','Hlavná 10','Košice') as value");
  await t.test("only an admin can assign a verified and available professional", async () => {
    await assert.rejects(as(customer, "select public.assign_master($1,$2)", [order,master]), /administrátor/);
    await assert.rejects(as(admin, "select public.assign_master($1,$2)", [order,master]), /overeného/);
    await as(admin, "select public.verify_master($1,true)", [master]);
    await as(admin, "select public.assign_master($1,$2)", [order,master]);
    assert.equal((await as(stranger,"select * from public.orders where id=$1",[order])).length,0);
    assert.equal((await as(customer,"select full_name from public.profiles where id=$1",[master])).length,1);
    await assert.rejects(as(customer,"update public.orders set status='completed' where id=$1",[order]),/permission denied/);
    await assert.rejects(as(stranger,"select public.respond_to_order($1,true)",[order]),/nemožno/);
    await as(master,"select public.respond_to_order($1,true)",[order]);
    await assert.rejects(as(admin,"select public.assign_master($1,$2)",[order,unverified]),/nemožno zmeniť/);
  });
  let quote = await scalar<string>(master,"select public.propose_quote($1,'Výmena poškodenej zásuvky',5000,1000,500) as value",[order]);
  await t.test("prices may go down; old proposals cannot be accepted; only the customer consents", async () => {
    const old = quote;
    quote = await scalar<string>(master,"select public.propose_quote($1,'Výmena zásuvky, lacnejší materiál',4000,500,500) as value",[order]);
    await assert.rejects(as(customer,"select public.respond_to_quote($1,true)",[old]),/zmenila/);
    await assert.rejects(as(master,"select public.respond_to_quote($1,true)",[quote]),/nemáte prístup/);
    await assert.rejects(as(stranger,"select public.respond_to_quote($1,true)",[quote]),/nemáte prístup/);
    assert.equal((await as(stranger,"select * from public.order_quotes")).length,0);
    await as(customer,"select public.respond_to_quote($1,false,'Prosím menší rozsah')",[quote]);
    quote = await scalar<string>(master,"select public.propose_quote($1,'Výmena zásuvky podľa dohody',3500,500,500) as value",[order]);
    await as(customer,"select public.respond_to_quote($1,true)",[quote]);
    await assert.rejects(as(customer,"select public.respond_to_quote($1,true)",[quote]),/zmenila/);
    await assert.rejects(as(master,"select public.propose_quote($1,'Zvýšenie už schválenej ceny',9999,0,0)",[order]),/uhradiť/);
    await assert.rejects(as(master,"select public.withdraw_quote($1)",[quote]),/neschválenú/);
    assert.equal(await scalar<number>(customer,"select final_price as value from public.orders where id=$1",[order]),4500);
  });
  const payment = await scalar<string>(customer,"select id as value from public.payments where quote_id=$1",[quote]);
  await t.test("payment reservation, tamper rejection and duplicate webhook delivery", async () => {
    await assert.rejects(as(stranger,"select public.prepare_checkout($1)",[payment]),/nenašla/);
    await assert.rejects(as(customer,"update public.payments set status='paid' where id=$1",[payment]),/permission denied/);
    await assert.rejects(as(customer,"select public.settle_checkout($1,0,'cs_1','pi_1',4500,'eur')",[payment]),/permission denied/);
    const first = await scalar<{ checkout_attempt: number; attempt_started_at: string }>(customer,"select public.prepare_checkout($1) as value",[payment]);
    const retry = await scalar<{ checkout_attempt: number; attempt_started_at: string }>(customer,"select public.prepare_checkout($1) as value",[payment]);
    assert.deepEqual(first,retry);
    await as(null,"select public.attach_checkout($1,0,'cs_1')",[payment],"service_role");
    await assert.rejects(as(null,"select public.settle_checkout($1,0,'cs_1','pi_1',4501,'eur')",[payment],"service_role"),/nezhodujú/);
    await assert.rejects(as(null,"select public.settle_checkout($1,0,'cs_1','pi_1',4500,'usd')",[payment],"service_role"),/nezhodujú/);
    await as(null,"select public.settle_checkout($1,0,'cs_1','pi_1',4500,'eur')",[payment],"service_role");
    await as(null,"select public.settle_checkout($1,0,'cs_1','pi_1',4500,'eur')",[payment],"service_role");
    assert.equal(await scalar<string>(customer,"select status as value from public.orders where id=$1",[order]),"in_progress");
    assert.equal(await scalar<number>(customer,"select count(*)::int as value from public.payments where order_id=$1",[order]),1);
    await assert.rejects(as(customer,"select public.prepare_checkout($1)",[payment]),/nemožno/);
    await as(null,"select public.reset_checkout($1,0)",[payment],"service_role");
    assert.equal(await scalar<string>(customer,"select status as value from public.payments where id=$1",[payment]),"paid");
  });
  await t.test("extras require independent approval and payment before completion", async () => {
    const extra = await scalar<string>(master,"select public.propose_quote($1,'Doplnenie druhej zásuvky',1000,500,0) as value",[order]);
    await assert.rejects(as(master,"select public.complete_order($1)",[order]),/ponuky a platby/);
    await as(customer,"select public.respond_to_quote($1,true)",[extra]);
    await assert.rejects(as(master,"select public.complete_order($1)",[order]),/ponuky a platby/);
    const second = await scalar<string>(customer,"select id as value from public.payments where quote_id=$1",[extra]);
    await as(customer,"select public.prepare_checkout($1)",[second]);
    await as(null,"select public.attach_checkout($1,0,'cs_2')",[second],"service_role");
    await as(null,"select public.settle_checkout($1,0,'cs_2','pi_2',1500,'eur')",[second],"service_role");
    await as(master,"select public.complete_order($1)",[order]);
    const totals = (await as<{final_price:number;commission_amount:number;status:string}>(customer,"select final_price,commission_amount,status from public.orders where id=$1",[order]))[0];
    assert.deepEqual(totals,{final_price:6000,commission_amount:1200,status:"completed"});
    await assert.rejects(as(master,"select public.propose_quote($1,'Práce po dokončení objednávky',1000,0,0)",[order]),/po prijatí/);
  });
  const conversation = await scalar<string>(customer,"select id as value from public.conversations where order_id=$1 and kind='order'",[order]);
  let support: string;
  await t.test("order chat, support privacy, duplicate sends, unread counts and closed threads", async () => {
    const beforeMessages = Number(await scalar<number>(master,"select count(*)::int as value from public.messages where conversation_id=$1",[conversation]));
    const clientId = crypto.randomUUID();
    const message = await scalar<number>(customer,"select public.send_message($1,'Dobrý deň, ďakujem za opravu.',$2) as value",[conversation,clientId]);
    const duplicate = await scalar<number>(customer,"select public.send_message($1,'Dobrý deň, ďakujem za opravu.',$2) as value",[conversation,clientId]);
    assert.equal(message,duplicate);
    assert.equal((await as(master,"select * from public.messages where conversation_id=$1",[conversation])).length,beforeMessages + 1);
    assert.equal((await as(stranger,"select * from public.messages")).length,0);
    await assert.rejects(as(stranger,"select public.send_message($1,'Cudzia správa',$2)",[conversation,crypto.randomUUID()]),/nemáte prístup/);
    const unread = await scalar<number>(master,"select unread_count::int as value from public.message_inbox() where id=$1",[conversation]);
    assert.ok(unread >= 1);
    await as(master,"select public.mark_conversation_read($1,$2)",[conversation,message]);
    assert.equal(await scalar<number>(master,"select unread_count::int as value from public.message_inbox() where id=$1",[conversation]),0);
    assert.equal(await scalar<number>(master,"select public.unread_message_count()::int as value"),0);
    support = await scalar<string>(customer,"select public.create_support('Otázka k platbe','Potrebujem pomoc s platbou.',$1,$2) as value",[crypto.randomUUID(),order]);
    assert.equal((await as(master,"select * from public.conversations where id=$1",[support])).length,0);
    assert.equal((await as(master,"select * from public.messages where conversation_id=$1",[support])).length,0);
    await assert.rejects(as(master,"select public.send_message($1,'Nesmiem vidieť podnet',$2)",[support,crypto.randomUUID()]),/nemáte prístup/);
    await as(admin,"select public.send_message($1,'Dobrý deň, preveríme to.',$2)",[support,crypto.randomUUID()]);
    await as(admin,"select public.set_support_status($1,true)",[support]);
    await assert.rejects(as(customer,"select public.send_message($1,'Ďalšia otázka',$2)",[support,crypto.randomUUID()]),/uzavretá/);
    await as(customer,"select public.set_support_status($1,false)",[support]);
    await as(customer,"select public.send_message($1,'Ďakujem za vysvetlenie.',$2)",[support,crypto.randomUUID()]);
    const masterSupport = await scalar<string>(master,"select public.create_support('Podnet majstra','Potrebujem vyriešiť vyplatenie.',$1,$2) as value",[crypto.randomUUID(),order]);
    assert.equal((await as(customer,"select * from public.conversations where id=$1",[masterSupport])).length,0);
  });
  await t.test("ratings must reference the correct professional", async () => {
    await assert.rejects(as(customer,"insert into public.ratings(order_id,customer_id,master_id,stars) values($1,$2,$3,5)",[order,customer,unverified]),/row-level security/);
    await as(customer,"insert into public.ratings(order_id,customer_id,master_id,stars) values($1,$2,$3,5)",[order,customer,master]);
    assert.equal(Number(await scalar<number>(admin,"select rating_avg as value from public.masters where profile_id=$1",[master])),5);
  });
  await t.test("refund webhooks are monotonic and cannot be triggered by customers", async () => {
    await assert.rejects(as(customer,"select public.record_refund('pi_1',4500)"),/permission denied/);
    await as(null,"select public.record_refund('pi_1',1000)",[],"service_role");
    await as(null,"select public.record_refund('pi_1',500)",[],"service_role");
    assert.equal(await scalar<number>(customer,"select refunded_amount as value from public.payments where id=$1",[payment]),1000);
    await as(null,"select public.settle_checkout($1,0,'cs_1','pi_1',4500,'eur')",[payment],"service_role");
    assert.equal(await scalar<string>(customer,"select stripe_payment_status as value from public.orders where id=$1",[order]),"partially_refunded");
  });
  await t.test("legacy paid orders retain their original amount when an extra is approved", async () => {
    const legacy = await scalar<string>(customer,"select public.create_order(1,'Staršia už zaplatená zákazka','Hlavná 10','Košice') as value");
    await db.query("update public.orders set master_id=$2,status='in_progress',final_price=8000 where id=$1",[legacy,master]);
    await db.query("insert into public.payments(order_id,amount,commission_amount,master_amount,status,stripe_payment_intent_id) values($1,8000,1600,6400,'paid','pi_legacy')",[legacy]);
    await as(null,"select public.record_refund('pi_legacy',500)",[],"service_role");
    const extra = await scalar<string>(master,"select public.propose_quote($1,'Doplnenie k pôvodnej zaplatenej práci',1000,0,0) as value",[legacy]);
    await as(customer,"select public.respond_to_quote($1,true)",[extra]);
    assert.equal(await scalar<number>(customer,"select final_price as value from public.orders where id=$1",[legacy]),9000);
    const extraPayment = await scalar<string>(customer,"select id as value from public.payments where quote_id=$1",[extra]);
    await as(customer,"select public.prepare_checkout($1)",[extraPayment]);
    await as(null,"select public.settle_checkout($1,0,'cs_legacy_extra','pi_legacy_extra',1000,'eur')",[extraPayment],"service_role");
    assert.equal(await scalar<string>(customer,"select stripe_payment_status as value from public.orders where id=$1",[legacy]),"partially_refunded");
    await as(master,"select public.complete_order($1)",[legacy]);
    assert.equal(await scalar<number>(customer,"select final_price as value from public.orders where id=$1",[legacy]),9000);
  });
  await t.test("private photos are visible only to order participants; cancellation is guarded", async () => {
    const another = await scalar<string>(customer,"select public.create_order(1,'Tečie kohútik v kuchyni','Hlavná 10','Košice') as value");
    const name = `${customer}/${another}/photo.jpg`;
    await as(customer,"insert into storage.objects(bucket_id,name) values('order-photos',$1)",[name]);
    await as(customer,"select public.attach_order_photo($1,$2)",[another,name]);
    await as(customer,"select public.attach_order_photo($1,$2)",[another,name]);
    assert.equal(await scalar<number>(customer,"select count(*)::int as value from public.order_photos where order_id=$1",[another]),1);
    await assert.rejects(as(stranger,"select public.attach_order_photo($1,$2)",[another,name]),/nemožno pridať/);
    for (let i=2;i<=5;i++) await as(customer,"insert into storage.objects(bucket_id,name) values('order-photos',$1)",[`${customer}/${another}/photo${i}.jpg`]);
    await assert.rejects(as(customer,"insert into storage.objects(bucket_id,name) values('order-photos',$1)",[`${customer}/${another}/photo6.jpg`]),/row-level security/);
    assert.equal((await as(stranger,"select * from storage.objects")).length,0);
    assert.equal((await as(null,"select * from storage.objects",[],"anon")).length,0);
    assert.equal((await as(customer,"select * from storage.objects where name=$1",[name])).length,1);
    await as(admin,"select public.assign_master($1,$2)",[another,master]);
    assert.equal((await as(master,"select * from storage.objects where name=$1",[name])).length,1);
    await assert.rejects(as(stranger,"select public.cancel_order($1)",[another]),/nemáte prístup/);
    await as(customer,"select public.cancel_order($1)",[another]);
    await assert.rejects(as(master,"select public.respond_to_order($1,true)",[another]),/nemožno/);
    await assert.rejects(as(customer,"select public.cancel_order($1)",[order]),/podporu/);
    assert.equal((await db.query<{public:boolean}>("select public from storage.buckets where id='order-photos'")).rows[0].public,false);
  });
});
