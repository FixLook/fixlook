import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const services = [
  {
    name: "Elektrikár",
    description:
      "Elektroinštalácie, zásuvky, osvetlenie a drobné opravy.",
    base_price: 6000,
    estimate_max: 15000,
    active: true
  },
  {
    name: "Inštalatér",
    description: "Úniky vody, batérie, odpady a drobné inštalatérske práce.",
    base_price: 5500,
    estimate_max: 14000,
    active: true
  }
];

const { error } = await supabase
  .from("services")
  .upsert(services, { onConflict: "name", ignoreDuplicates: true });

if (error) {
  throw error;
}

console.log("Služby FixLook boli doplnené. Existujúce ceny zostali zachované.");
