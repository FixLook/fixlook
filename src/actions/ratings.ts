"use server";

import { publicError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { redirectWithError } from "@/lib/form";
import { requireProfile } from "@/lib/auth";
import {
  createServerSupabaseClient
} from "@/lib/supabase/server";
import { ratingSchema } from "@/lib/validators";

export async function createRatingAction(formData: FormData) {
  const profile = await requireProfile("customer");
  const parsed = ratingSchema.safeParse({
    orderId: formData.get("orderId"),
    stars: formData.get("stars"),
    comment: formData.get("comment")
  });

  if (!parsed.success) {
    redirectWithError("/customer/ratings", parsed.error.errors[0]?.message ?? "Skontrolujte hodnotenie.");
  }

  const supabase = await createServerSupabaseClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, customer_id, master_id, status")
    .eq("id", parsed.data.orderId)
    .single();

  if (
    !order ||
    order.customer_id !== profile.id ||
    !order.master_id ||
    order.status !== "completed"
  ) {
    redirectWithError("/customer/ratings", "Túto objednávku zatiaľ nemožno ohodnotiť.");
  }

  const { error } = await supabase.from("ratings").insert({
    order_id: order.id,
    customer_id: profile.id,
    master_id: order.master_id,
    stars: parsed.data.stars,
    comment: parsed.data.comment
  });

  if (error) {
    redirectWithError("/customer/ratings", publicError(error));
  }

  revalidatePath("/customer/ratings");
}
