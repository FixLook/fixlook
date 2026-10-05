// Stripe retains idempotency keys for at least 24 hours. Stop automatic retries
// before then if the Checkout Session ID could not be persisted. An older
// session may already have been paid even though its webhook has not arrived.
export function needsCheckoutReconciliation(startedAt: string | null, now = Date.now()) {
  const started = startedAt ? Date.parse(startedAt) : NaN;
  return !Number.isFinite(started) || now - started >= 23 * 60 * 60 * 1000;
}
