import "server-only";

import Stripe from "stripe";
import { STRIPE_API_VERSION, stripeKeyForMode } from "@/lib/stripe-config";

let stripe: Stripe | null = null;

export function getStripe() {
  const key = stripeKeyForMode(process.env.STRIPE_SECRET_KEY, process.env.STRIPE_EXPECTED_MODE);

  if (!stripe) {
    stripe = new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true
    });
  }

  return stripe;
}

export function calculateCommission(amount: number) {
  const commissionAmount = Math.round(amount * 0.2);

  return {
    commissionAmount,
    masterAmount: amount - commissionAmount
  };
}
