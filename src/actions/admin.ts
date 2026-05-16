"use server";

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
    redirectWithError("/admin/orders", "Select an order and professional.");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("orders")
    .update({ master_id: masterId, status: "assigned" })
    .eq("id", orderId);

  if (error) {
    redirectWithError("/admin/orders", error.message);
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
    active: formData.get("active") === "on"
  });

  if (!parsed.success) {
    redirectWithError("/admin/services", parsed.error.errors[0]?.message ?? "Invalid service.");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("services").insert({
    name: parsed.data.name,
    description: parsed.data.description,
    base_price: euroToCents(parsed.data.basePrice),
    active: parsed.data.active
  });

  if (error) {
    redirectWithError("/admin/services", error.message);
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
    redirectWithError("/admin/services", error.message);
  }

  revalidatePath("/admin/services");
}

export async function updateMasterVerificationAction(formData: FormData) {
  await requireProfile("admin");
  const profileId = String(formData.get("profileId") ?? "");
  const verified = formData.get("verified") === "true";
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("masters")
    .update({ verified: !verified })
    .eq("profile_id", profileId);

  if (error) {
    redirectWithError("/admin/professionals", error.message);
  }

  revalidatePath("/admin/professionals");
}
