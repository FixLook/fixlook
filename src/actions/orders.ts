"use server";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { orderSchema, uuidSchema } from "@/lib/validators";
import { bratislavaDateTime } from "@/lib/pricing";
import { publicError } from "@/lib/errors";

export async function createOrderAction(form: FormData) {
  await requireProfile("customer");
  const parsed = orderSchema.safeParse(Object.fromEntries(form));
  const requestId = uuidSchema.safeParse(form.get("requestId"));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Skontrolujte objednávku." };
  if (!requestId.success) return { error: "Obnovte stránku a skúste to znova." };
  let preferred: string | null;
  try { preferred = bratislavaDateTime(parsed.data.preferredDatetime ?? ""); }
  catch (error) { return { error: error instanceof Error ? error.message : "Neplatný termín." }; }
  const db = await createServerSupabaseClient();
  const { data: id, error } = await db.rpc("create_order", { p_service: parsed.data.serviceId, p_description: parsed.data.problemDescription, p_address: parsed.data.address, p_city: parsed.data.city, p_preferred: preferred, p_request: requestId.data });
  if (error || !id) return { error: publicError(error) };
  revalidatePath("/customer/dashboard");
  return { orderId: id };
}
