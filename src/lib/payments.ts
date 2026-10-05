import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function syncPaidCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return { ok: false as const, message: "Platba ešte nie je potvrdená." };
  const meta = session.metadata;
  if (!meta?.paymentId) throw new Error("Untracked checkout session: reconcile legacy payment before launch.");
  const db = createServiceSupabaseClient();
  const { data: payment, error } = await db.from("payments").select("*").eq("id", meta.paymentId).single();
  if (error || !payment) throw new Error("Payment record unavailable.");
  const { data: order } = await db.from("orders").select("customer_id").eq("id", payment.order_id).single();
  if (meta.orderId !== payment.order_id || meta.quoteId !== payment.quote_id || meta.customerId !== order?.customer_id || !/^\d+$/.test(meta.attempt ?? "")) throw new Error("Checkout metadata mismatch.");
  const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!intent || session.amount_total === null || !session.currency || session.mode !== "payment") throw new Error("Incomplete payment details.");
  const result = await db.rpc("settle_checkout", { p_payment: payment.id, p_attempt: Number(meta.attempt), p_session: session.id, p_intent: intent, p_amount: session.amount_total, p_currency: session.currency });
  if (result.error) throw new Error("Payment transaction failed.");
  return { ok: true as const, orderId: result.data };
}

export async function confirmCheckoutSession(sessionId: string, customerId: string) {
  try {
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) throw new Error("Invalid session.");
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.metadata?.customerId !== customerId) throw new Error("Unauthorized session.");
    return await syncPaidCheckoutSession(session);
  } catch {
    return { ok: false as const, message: "Potvrdenie platby sa zatiaľ nepodarilo načítať. Stav si overte v objednávke; ak vám platba odišla, neposielajte ju znova a kontaktujte podporu." };
  }
}
