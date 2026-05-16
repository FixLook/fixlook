"use server";

import { revalidatePath } from "next/cache";
import { redirectWithError } from "@/lib/form";
import { requireProfile } from "@/lib/auth";
import {
  createServerSupabaseClient,
  createServiceSupabaseClient
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
    redirectWithError("/customer/ratings", parsed.error.errors[0]?.message ?? "Invalid rating.");
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
    redirectWithError("/customer/ratings", "This order cannot be rated.");
  }

  const { error } = await supabase.from("ratings").insert({
    order_id: order.id,
    customer_id: profile.id,
    master_id: order.master_id,
    stars: parsed.data.stars,
    comment: parsed.data.comment
  });

  if (error) {
    redirectWithError("/customer/ratings", error.message);
  }

  const { data: ratings } = await supabase
    .from("ratings")
    .select("stars")
    .eq("master_id", order.master_id);

  if (ratings?.length) {
    const ratingAvg =
      ratings.reduce((total, rating) => total + rating.stars, 0) / ratings.length;

    await createServiceSupabaseClient()
      .from("masters")
      .update({ rating_avg: Number(ratingAvg.toFixed(2)) })
      .eq("profile_id", order.master_id);
  }

  revalidatePath("/customer/ratings");
}
