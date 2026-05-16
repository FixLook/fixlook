import { createCheckoutSessionAction } from "@/actions/payments";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export default async function CustomerPaymentPage({
  params
}: {
  params: Promise<{ orderId: string }>;
}) {
  const profile = await requireProfile("customer");
  const { orderId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("customer_id", profile.id)
    .single();

  if (!order) {
    return <p className="text-sm text-muted-foreground">Order was not found.</p>;
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{order.order_number}</span>
            <StatusBadge status={order.status} />
          </div>
          <div className="rounded-lg bg-accent p-5">
            <p className="text-sm text-muted-foreground">Amount due</p>
            <p className="mt-1 text-4xl font-bold text-dark">
              {formatCurrency(order.final_price ?? order.estimated_price)}
            </p>
          </div>
          <form action={createCheckoutSessionAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <SubmitButton className="w-full" pendingText="Opening Stripe...">
              Pay with Stripe
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
