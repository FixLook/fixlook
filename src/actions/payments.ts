"use server";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { redirectWithError } from "@/lib/form";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { syncPaidCheckoutSession } from "@/lib/payments";
import { uuidSchema } from "@/lib/validators";
import { publicError } from "@/lib/errors";
import { needsCheckoutReconciliation } from "@/lib/checkout";

export async function createCheckoutSessionAction(form: FormData) {
  const profile = await requireProfile("customer");
  const parsed = uuidSchema.safeParse(form.get("paymentId"));
  if (!parsed.success) redirectWithError("/customer/dashboard", "Neplatná platba.");
  const db = await createServerSupabaseClient();
  const { data: payment, error } = await db.rpc("prepare_checkout", { p_payment: parsed.data });
  if (error || !payment) redirectWithError("/customer/dashboard", publicError(error));
  const path = `/customer/orders/${payment.order_id}`;
  let checkoutUrl: string | null = null;
  let paid = false;
  let expired = false;
  let needsReview = false;
  try {
    const stripe = getStripe();
    const service = createServiceSupabaseClient();
    if (payment.stripe_checkout_session_id) {
      const existing = await stripe.checkout.sessions.retrieve(payment.stripe_checkout_session_id);
      if (existing.payment_status === "paid") {
        await syncPaidCheckoutSession(existing);
        paid = true;
      } else if (existing.status === "open") {
        checkoutUrl = existing.url;
      } else if (existing.status === "expired") {
        const result = await service.rpc("reset_checkout", { p_payment: payment.id, p_attempt: payment.checkout_attempt });
        if (result.error) throw result.error;
        expired = true;
      }
    } else if (needsCheckoutReconciliation(payment.attempt_started_at)) {
      // Do not discard a missing Stripe response: that session may already be paid.
      needsReview = true;
    } else {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!appUrl || (process.env.NODE_ENV === "production" && !appUrl.startsWith("https://"))) throw new Error("APP_URL");
      const session = await stripe.checkout.sessions.create({
        mode: "payment", locale: "sk", payment_method_types: ["card"],
        client_reference_id: payment.id,
        line_items: [{ price_data: { currency: "eur", unit_amount: payment.amount, product_data: { name: "FixLook – schválená cenová ponuka" } }, quantity: 1 }],
        success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}${path}`,
        metadata: { paymentId: payment.id, quoteId: payment.quote_id!, orderId: payment.order_id, customerId: profile.id, attempt: String(payment.checkout_attempt) }
      }, { idempotencyKey: `fixlook-payment-${payment.id}-${payment.checkout_attempt}` });
      const attached = await service.rpc("attach_checkout", { p_payment: payment.id, p_attempt: payment.checkout_attempt, p_session: session.id });
      if (attached.error) throw attached.error;
      if (session.payment_status === "paid") { await syncPaidCheckoutSession(session); paid = true; }
      else if (session.status === "expired") {
        const reset = await service.rpc("reset_checkout", { p_payment: payment.id, p_attempt: payment.checkout_attempt });
        if (reset.error) throw reset.error;
        expired = true;
      } else checkoutUrl = session.url;
    }
  } catch {
    // Keep the same reservation/idempotency key after a timeout. Never overwrite a paid record.
    redirectWithError(path, "Platbu sa nepodarilo otvoriť. Skúste to znova; schválená cena zostáva zachovaná.");
  }
  if (paid) redirect(path);
  if (needsReview) redirectWithError(path, "Pred ďalším pokusom musí podpora overiť stav predchádzajúcej platby. Kontaktujte podporu pri tejto objednávke; neposielajte platbu znova.");
  if (expired) redirectWithError(path, "Platobná relácia vypršala. Kliknite znova na Zaplatiť a otvorí sa nová.");
  if (!checkoutUrl) redirectWithError(path, "Platba sa ešte spracúva. Skúste stránku obnoviť o chvíľu.");
  redirect(checkoutUrl);
}
