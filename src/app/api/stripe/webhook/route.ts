import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { syncPaidCheckoutSession } from "@/lib/payments";

export async function POST(request: Request) {
  const signature = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing Stripe webhook configuration." }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripe();

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    if (event.type === "checkout.session.completed") {
      await syncPaidCheckoutSession(event.data.object);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
