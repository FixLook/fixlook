import "server-only";

import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is required.");
  }

  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
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
