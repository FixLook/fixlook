"use server";

import { publicError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { euroToCents, redirectWithError } from "@/lib/form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { serviceSchema } from "@/lib/validators";

export async function assignMasterAction(formData: FormData) {
  await requireProfile("admin");
  const orderId = String(formData.get("orderId") ?? "");
  const masterId = String(formData.get("masterId") ?? "");

  if (!orderId || !masterId) {
    redirectWithError("/admin/orders", "Vyberte objednávku a majstra.");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("assign_master", { p_order: orderId, p_master: masterId });

  if (error) {
    redirectWithError("/admin/orders", publicError(error));
  }

  revalidatePath("/admin/orders");
  revalidatePath("/master/dashboard");
}

export async function createServiceAction(formData: FormData) {
  await requireProfile("admin");
  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    basePrice: formData.get("basePrice"),
    estimateMax: formData.get("estimateMax"),
    active: formData.get("active") === "on"
  });

  if (!parsed.success) {
    redirectWithError("/admin/services", parsed.error.errors[0]?.message ?? "Skontrolujte údaje služby.");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("services").insert({
    name: parsed.data.name,
    description: parsed.data.description,
    base_price: euroToCents(parsed.data.basePrice),
    estimate_max: parsed.data.estimateMax === undefined ? null : euroToCents(parsed.data.estimateMax),
    active: parsed.data.active
  });

  if (error) {
    redirectWithError("/admin/services", publicError(error));
  }

  revalidatePath("/admin/services");
}

export async function toggleServiceAction(formData: FormData) {
  await requireProfile("admin");
  const serviceId = Number(formData.get("serviceId"));
  const active = formData.get("active") === "true";
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("services")
    .update({ active: !active })
    .eq("id", serviceId);

  if (error) {
    redirectWithError("/admin/services", publicError(error));
  }

  revalidatePath("/admin/services");
}

export async function updateMasterVerificationAction(formData: FormData) {
  await requireProfile("admin");
  const profileId = String(formData.get("profileId") ?? "");
  const verified = formData.get("verified") === "true";
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("verify_master", { p_master: profileId, p_verified: !verified });

  if (error) {
    redirectWithError("/admin/professionals", publicError(error));
  }

  revalidatePath("/admin/professionals");
}

export async function updateServiceAction(formData: FormData) {
  await requireProfile("admin");
  const id = Number(formData.get("serviceId"));
  const parsed = serviceSchema.safeParse({ name: formData.get("name"), description: formData.get("description"), basePrice: formData.get("basePrice"), estimateMax: formData.get("estimateMax"), active: formData.get("active") === "on" });
  if (!parsed.success || !Number.isSafeInteger(id) || id < 1) redirectWithError("/admin/services", "Skontrolujte názov a rozsah cien služby.");
  const db = await createServerSupabaseClient();
  const { error } = await db.from("services").update({ name: parsed.data.name, description: parsed.data.description, base_price: euroToCents(parsed.data.basePrice), estimate_max: parsed.data.estimateMax === undefined ? null : euroToCents(parsed.data.estimateMax), active: parsed.data.active }).eq("id", id).select("id").single();
  if (error) redirectWithError("/admin/services", publicError(error));
  revalidatePath("/admin/services");
  revalidatePath("/customer/orders/new");
}
