import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { retryFailedCheckoutSession, syncPaidCheckoutSession } from "@/lib/payments";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type Stripe from "stripe";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Platby nie sú nakonfigurované." }, { status: 503 });
  if (!signature) return NextResponse.json({ error: "Chýba podpis." }, { status: 400 });
  let event: Stripe.Event;
  try { event = getStripe().webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return NextResponse.json({ error: "Neplatný podpis." }, { status: 400 }); }
  if (event.livemode !== (process.env.STRIPE_EXPECTED_MODE === "live")) {
    return NextResponse.json({ error: "Nesprávny režim platby." }, { status: 400 });
  }
  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await syncPaidCheckoutSession(event.data.object);
    } else if (event.type === "checkout.session.async_payment_failed") {
      await retryFailedCheckoutSession(event.data.object);
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const intent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (intent) {
        const { error } = await createServiceSupabaseClient().rpc("record_refund", { p_intent: intent, p_refunded: charge.amount_refunded });
        if (error) throw new Error("Refund sync failed.");
      }
    }
    return NextResponse.json({ received: true });
  } catch {
    console.error("Stripe event processing failed", { eventId: event.id, type: event.type });
    // A valid event that failed persistence MUST be retried by Stripe.
    return NextResponse.json({ error: "Synchronizácia platby zlyhala." }, { status: 500 });
  }
}
