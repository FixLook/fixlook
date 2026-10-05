import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";

config({ path: ".env.local" });
config();

async function main() {
const live = process.argv.includes("--live");
const errors: string[] = [];
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET"
];

for (const name of required) {
  if (!process.env[name]?.trim()) errors.push(`Chýba ${name}.`);
}
for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_APP_URL"]) {
  const value = process.env[name];
  if (!value) continue;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    if (live && (url.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(url.hostname))) {
      errors.push(`${name} musí pre ostrú prevádzku obsahovať verejnú HTTPS adresu.`);
    }
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") {
      errors.push(`${name} musí byť základná adresa bez prihlasovacích údajov, cesty alebo parametrov.`);
    }
  } catch {
    errors.push(`${name} nie je platná HTTP(S) adresa.`);
  }
}
if (live && !process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")) {
  errors.push("Pre ostrú prevádzku je potrebný Stripe live kľúč. Testovací kľúč neúčtuje skutočné platby.");
}
if (process.env.STRIPE_WEBHOOK_SECRET && !process.env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")) {
  errors.push("STRIPE_WEBHOOK_SECRET nemá očakávaný formát.");
}

if (!errors.length && process.argv.includes("--database")) {
  try {
    const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const checks = await Promise.all([
      db.from("order_quotes").select("id").limit(0),
      db.from("payments").select("quote_id,checkout_attempt,refunded_amount").limit(0),
      db.from("orders").select("client_request_id,estimated_price_max").limit(0),
      db.rpc("unread_message_count")
    ]);
    if (checks.some(check => check.error)) errors.push("Databáza nie je dostupná alebo chýba migrácia 002.");
    const bucket = await db.storage.getBucket("order-photos");
    if (bucket.error || !bucket.data || bucket.data.public) errors.push("Úložisko order-photos musí existovať a byť súkromné.");
  } catch {
    errors.push("Overenie spojenia s databázou zlyhalo.");
  }
}

if (errors.length) {
  console.error("Konfigurácia nie je pripravená:\n" + errors.map(error => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Kontrola konfigurácie prešla. Hodnoty tajných kľúčov neboli vypísané.");
  console.log("Toto nie je test doručenia e-mailov, platby, výplat majstrov ani prevádzkovej pripravenosti. Dokončite checklist v docs/NASADENIE.md.");
}
}

void main();
