"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { calculateCommission } from "@/lib/stripe";
import { euroToCents, redirectWithError } from "@/lib/form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { finalPriceSchema, masterProfileSchema } from "@/lib/validators";

export async function acceptOrderAction(formData: FormData) {
  const profile = await requireProfile("master");
  const orderId = String(formData.get("orderId") ?? "");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "accepted" })
    .eq("id", orderId)
    .eq("master_id", profile.id);

  if (error) {
    redirectWithError("/master/orders", error.message);
  }

  revalidatePath("/master/orders");
}

export async function rejectOrderAction(formData: FormData) {
  const profile = await requireProfile("master");
  const orderId = String(formData.get("orderId") ?? "");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("orders")
    .update({ master_id: null, status: "new" })
    .eq("id", orderId)
    .eq("master_id", profile.id);

  if (error) {
    redirectWithError("/master/orders", error.message);
  }

  revalidatePath("/master/orders");
}

export async function completeOrderAction(formData: FormData) {
  const profile = await requireProfile("master");
  const parsed = finalPriceSchema.safeParse({
    orderId: formData.get("orderId"),
    finalPrice: formData.get("finalPrice")
  });

  if (!parsed.success) {
    redirectWithError("/master/orders", parsed.error.errors[0]?.message ?? "Invalid price.");
  }

  const finalPrice = euroToCents(parsed.data.finalPrice);
  const { commissionAmount } = calculateCommission(finalPrice);
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("orders")
    .update({
      status: "completed",
      final_price: finalPrice,
      commission_amount: commissionAmount,
      completed_at: new Date().toISOString()
    })
    .eq("id", parsed.data.orderId)
    .eq("master_id", profile.id);

  if (error) {
    redirectWithError("/master/orders", error.message);
  }

  revalidatePath("/master/orders");
}

export async function updateMasterProfileAction(formData: FormData) {
  const profile = await requireProfile("master");
  const parsed = masterProfileSchema.safeParse({
    description: formData.get("description"),
    hourlyRate: formData.get("hourlyRate"),
    available: formData.get("available") === "on"
  });

  if (!parsed.success) {
    redirectWithError("/master/profile", parsed.error.errors[0]?.message ?? "Invalid profile.");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("masters").upsert(
    {
      profile_id: profile.id,
      description: parsed.data.description,
      hourly_rate: euroToCents(parsed.data.hourlyRate),
      available: parsed.data.available
    },
    { onConflict: "profile_id" }
  );

  if (error) {
    redirectWithError("/master/profile", error.message);
  }

  revalidatePath("/master/profile");
}
