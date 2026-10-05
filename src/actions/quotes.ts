"use server";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirectWithError, getString } from "@/lib/form";
import { moneyToCents } from "@/lib/pricing";
import { publicError } from "@/lib/errors";
import { uuidSchema } from "@/lib/validators";

export async function proposeQuoteAction(form: FormData) {
  const profile = await requireProfile();
  if (profile.role === "customer") redirectWithError("/customer/dashboard", "Cenovú ponuku pripravuje majster.");
  const id = uuidSchema.safeParse(form.get("orderId"));
  if (!id.success) redirectWithError(`/${profile.role}/dashboard`, "Neplatná objednávka.");
  const path = `/${profile.role}/orders/${id.data}`;
  let amounts: number[];
  try { amounts = ["labor", "materials", "travel"].map(key => moneyToCents(form.get(key))); }
  catch (error) { redirectWithError(path, error instanceof Error ? error.message : "Neplatná cena."); }
  const db = await createServerSupabaseClient();
  const { error } = await db.rpc("propose_quote", { p_order: id.data, p_scope: getString(form, "scope"), p_labor: amounts[0], p_materials: amounts[1], p_travel: amounts[2] });
  if (error) redirectWithError(path, publicError(error));
  revalidatePath("/", "layout");
}
export async function respondToQuoteAction(form: FormData) {
  await requireProfile("customer");
  const id = uuidSchema.safeParse(form.get("quoteId"));
  if (!id.success) redirectWithError("/customer/dashboard", "Neplatná ponuka.");
  const db = await createServerSupabaseClient();
  const { data: quote } = await db.from("order_quotes").select("order_id").eq("id", id.data).single();
  if (!quote) redirectWithError("/customer/dashboard", "Ponuka sa nenašla.");
  const { error } = await db.rpc("respond_to_quote", { p_quote: id.data, p_accept: form.get("decision") === "accept", p_note: getString(form, "note") });
  if (error) redirectWithError(`/customer/orders/${quote.order_id}`, publicError(error));
  revalidatePath("/", "layout");
}
export async function cancelOrderAction(form: FormData) {
  const profile = await requireProfile();
  const id = uuidSchema.safeParse(form.get("orderId"));
  if (!id.success) redirectWithError(`/${profile.role}/dashboard`, "Neplatná objednávka.");
  const db = await createServerSupabaseClient();
  const { error } = await db.rpc("cancel_order", { p_order: id.data });
  if (error) redirectWithError(`/${profile.role}/orders/${id.data}`, publicError(error));
  revalidatePath("/", "layout");
}

export async function withdrawQuoteAction(form: FormData) {
  const profile = await requireProfile();
  const id = uuidSchema.safeParse(form.get("quoteId"));
  if (!id.success) redirectWithError(`/${profile.role}/dashboard`, "Neplatná ponuka.");
  const db = await createServerSupabaseClient();
  const { data: quote } = await db.from("order_quotes").select("order_id").eq("id", id.data).single();
  if (!quote) redirectWithError(`/${profile.role}/dashboard`, "Ponuka sa nenašla.");
  const { error } = await db.rpc("withdraw_quote", { p_quote: id.data });
  if (error) redirectWithError(`/${profile.role}/orders/${quote.order_id}`, publicError(error));
  revalidatePath("/", "layout");
}
