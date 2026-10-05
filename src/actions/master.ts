"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { euroToCents, redirectWithError } from "@/lib/form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { masterProfileSchema, uuidSchema } from "@/lib/validators";
import { publicError } from "@/lib/errors";

async function respond(formData: FormData, accept: boolean) {
  await requireProfile("master");
  const id = uuidSchema.safeParse(formData.get("orderId"));
  if (!id.success) redirectWithError("/master/orders", "Neplatná objednávka.");
  const db = await createServerSupabaseClient();
  const { error } = await db.rpc("respond_to_order", { p_order: id.data, p_accept: accept });
  if (error) redirectWithError(`/master/orders/${id.data}`, publicError(error));
  revalidatePath("/", "layout");
  if (!accept) redirect("/master/orders");
}
export async function acceptOrderAction(formData: FormData) { await respond(formData, true); }
export async function rejectOrderAction(formData: FormData) { await respond(formData, false); }
export async function completeOrderAction(formData: FormData) {
  await requireProfile("master");
  const id = uuidSchema.safeParse(formData.get("orderId"));
  if (!id.success) redirectWithError("/master/orders", "Neplatná objednávka.");
  const db = await createServerSupabaseClient();
  const { error } = await db.rpc("complete_order", { p_order: id.data });
  if (error) redirectWithError(`/master/orders/${id.data}`, publicError(error));
  revalidatePath("/", "layout");
}
export async function updateMasterProfileAction(formData: FormData) {
  const profile = await requireProfile("master");
  const parsed = masterProfileSchema.safeParse({ description: formData.get("description"), hourlyRate: formData.get("hourlyRate"), available: formData.get("available") === "on" });
  if (!parsed.success) redirectWithError("/master/profile", parsed.error.errors[0]?.message ?? "Skontrolujte profil.");
  const db = await createServerSupabaseClient();
  const { error } = await db.from("masters").update({ description: parsed.data.description, hourly_rate: euroToCents(parsed.data.hourlyRate), available: parsed.data.available }).eq("profile_id", profile.id);
  if (error) redirectWithError("/master/profile", publicError(error));
  revalidatePath("/master/profile");
}
