import "dotenv/config";
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
    name: "Electrician",
    description:
      "Electrical diagnostics, repairs, sockets, switches, and small installations.",
    base_price: 6000,
    active: true
  },
  {
    name: "Plumber",
    description: "Leaks, clogged drains, sink, toilet, and pipe repairs.",
    base_price: 5500,
    active: true
  }
];

const { error } = await supabase
  .from("services")
  .upsert(services, { onConflict: "name" });

if (error) {
  throw error;
}

console.log("Seeded FixLook services.");
