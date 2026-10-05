// Verified against Stripe's current stable API on 2026-10-05.
export const STRIPE_API_VERSION = "2026-09-30.endive" as const;

export function stripeKeyForMode(key: string | undefined, mode: string | undefined) {
  if (!key || !/^(sk|rk)_(test|live)_/.test(key)) throw new Error("Chýba platný serverový Stripe kľúč.");
  if (mode !== "test" && mode !== "live") throw new Error("STRIPE_EXPECTED_MODE musí byť test alebo live.");
  if (!new RegExp(`^(sk|rk)_${mode}_`).test(key)) {
    throw new Error("Stripe kľúč nezodpovedá požadovanému režimu platieb.");
  }
  return key;
}

export function canRetryFailedCheckout(sessionStatus: string | null, paymentStatus: string, intentStatus: string) {
  return sessionStatus === "complete" && paymentStatus === "unpaid"
    && (intentStatus === "requires_payment_method" || intentStatus === "canceled");
}
