import "server-only";

import type Stripe from "stripe";
import { calculateCommission, getStripe } from "@/lib/stripe";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function syncPaidCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") {
    return { ok: false, message: "Checkout session is not paid yet." };
  }

  const orderId = session.metadata?.orderId;

  if (!orderId) {
    return { ok: false, message: "Missing order metadata." };
  }

  const supabase = createServiceSupabaseClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    return { ok: false, message: "Order was not found." };
  }

  const amount = session.amount_total ?? order.final_price ?? order.estimated_price ?? 0;
  const { commissionAmount, masterAmount } = calculateCommission(amount);
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  await supabase.from("payments").upsert(
    {
      order_id: orderId,
      stripe_payment_intent_id: paymentIntent,
      amount,
      commission_amount: commissionAmount,
      master_amount: masterAmount,
      status: "paid"
    },
    { onConflict: "order_id" }
  );

  await supabase
    .from("orders")
    .update({
      stripe_payment_status: "paid",
      status: order.status === "accepted" ? "in_progress" : order.status
    })
    .eq("id", orderId);

  return { ok: true, orderId };
}

export async function confirmCheckoutSession(sessionId: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  return syncPaidCheckoutSession(session);
}
