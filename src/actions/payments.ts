"use server";

import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { calculateCommission, getStripe } from "@/lib/stripe";
import { redirectWithError } from "@/lib/form";
import {
  createServerSupabaseClient,
  createServiceSupabaseClient
} from "@/lib/supabase/server";

export async function createCheckoutSessionAction(formData: FormData) {
  const profile = await requireProfile("customer");
  const orderId = String(formData.get("orderId") ?? "");
  const supabase = await createServerSupabaseClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_id, estimated_price, final_price, services(name)")
    .eq("id", orderId)
    .single();

  if (error || !order || order.customer_id !== profile.id) {
    redirectWithError("/customer/dashboard", "Order was not found.");
  }

  const amount = order.final_price ?? order.estimated_price ?? 0;

  if (amount < 50) {
    redirectWithError(`/customer/orders/${order.id}`, "Order price is missing.");
  }

  const { commissionAmount, masterAmount } = calculateCommission(amount);
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: profile.email,
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: amount,
          product_data: {
            name: `FixLook ${order.order_number}`,
            description: order.services?.name ?? "Home service"
          }
        },
        quantity: 1
      }
    ],
    success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/customer/orders/${order.id}`,
    metadata: {
      orderId: order.id,
      customerId: profile.id,
      commissionAmount: String(commissionAmount)
    }
  });

  const serviceSupabase = createServiceSupabaseClient();

  await serviceSupabase.from("payments").upsert(
    {
      order_id: order.id,
      amount,
      commission_amount: commissionAmount,
      master_amount: masterAmount,
      status: "pending"
    },
    { onConflict: "order_id" }
  );

  await serviceSupabase
    .from("orders")
    .update({ stripe_payment_status: "pending" })
    .eq("id", order.id);

  if (!session.url) {
    redirectWithError(`/customer/orders/${order.id}`, "Stripe checkout was not created.");
  }

  redirect(session.url);
}
