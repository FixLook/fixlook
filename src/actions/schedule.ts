"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirectWithError } from "@/lib/form";
import { publicError } from "@/lib/errors";
import { uuidSchema } from "@/lib/validators";
import { bratislavaDateTime } from "@/lib/pricing";

export async function proposeScheduleAction(form: FormData) {
  await requireProfile("master");
  const orderId = uuidSchema.safeParse(form.get("orderId"));
  if (!orderId.success) redirectWithError("/master/orders", "Neplatná objednávka.");
  const path = `/master/orders/${orderId.data}`;
  const duration = Number(form.get("duration"));
  let start: string | null;
  try { start = bratislavaDateTime(String(form.get("start") ?? "")); }
  catch (error) { redirectWithError(path, error instanceof Error ? error.message : "Neplatný termín."); }
  if (!start || !Number.isInteger(duration) || duration < 30 || duration > 480 || duration % 30 !== 0) {
    redirectWithError(path, "Vyberte budúci termín a trvanie v krokoch po 30 minútach.");
  }
  const db = await createServerSupabaseClient();
  const { error } = await db.rpc("propose_schedule", { p_order: orderId.data, p_start: start, p_duration: duration });
  if (error) redirectWithError(path, publicError(error));
  revalidatePath("/", "layout");
}

export async function respondToScheduleAction(form: FormData) {
  await requireProfile("customer");
  const orderId = uuidSchema.safeParse(form.get("orderId"));
  if (!orderId.success) redirectWithError("/customer/dashboard", "Neplatná objednávka.");
  const path = `/customer/orders/${orderId.data}`;
  const decision = form.get("decision");
  if (decision !== "accept" && decision !== "reject") redirectWithError(path, "Vyberte odpoveď na termín.");
  const db = await createServerSupabaseClient();
  const { error } = await db.rpc("respond_to_schedule", { p_order: orderId.data, p_accept: decision === "accept" });
  if (error) redirectWithError(path, publicError(error));
  revalidatePath("/", "layout");
}
