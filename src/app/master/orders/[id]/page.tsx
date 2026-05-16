import Image from "next/image";
import { acceptOrderAction, completeOrderAction, rejectOrderAction } from "@/actions/master";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function MasterOrderDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile("master");
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("master_id", profile.id)
    .single();

  if (!order) {
    return <p className="text-sm text-muted-foreground">Order was not found.</p>;
  }

  const [{ data: customer }, { data: service }, { data: photos }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", order.customer_id).single(),
    supabase.from("services").select("*").eq("id", order.service_id).single(),
    supabase.from("order_photos").select("*").eq("order_id", order.id)
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-dark">{order.order_number}</h1>
          <p className="mt-1 text-muted-foreground">{service?.name}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Job details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Detail label="Issue" value={order.problem_description} />
            <Detail label="Address" value={`${order.address}, ${order.city}`} />
            <Detail label="Preferred time" value={formatDateTime(order.preferred_datetime)} />
            <Detail label="Estimated price" value={formatCurrency(order.estimated_price)} />
            <Detail label="Payment" value={order.stripe_payment_status ?? "not paid"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Detail label="Name" value={customer?.full_name ?? "-"} />
            <Detail label="Phone" value={customer?.phone ?? "-"} />
            {order.status === "assigned" ? (
              <div className="flex gap-2">
                <form action={acceptOrderAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <SubmitButton pendingText="Accepting...">Accept</SubmitButton>
                </form>
                <form action={rejectOrderAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <SubmitButton variant="outline" pendingText="Rejecting...">
                    Reject
                  </SubmitButton>
                </form>
              </div>
            ) : null}
            {order.status === "in_progress" ? (
              <form action={completeOrderAction} className="space-y-3">
                <input type="hidden" name="orderId" value={order.id} />
                <div className="space-y-2">
                  <Label htmlFor="finalPrice">Final price EUR</Label>
                  <Input
                    id="finalPrice"
                    name="finalPrice"
                    type="number"
                    min="1"
                    step="0.01"
                    defaultValue={(order.estimated_price ?? 0) / 100}
                  />
                </div>
                <SubmitButton pendingText="Completing...">Complete order</SubmitButton>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(photos ?? []).map((photo) => (
              <div key={photo.id} className="relative aspect-square overflow-hidden rounded-lg border">
                <Image
                  src={photo.photo_url}
                  alt="Order photo"
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 25vw, 50vw"
                />
              </div>
            ))}
          </div>
          {!photos?.length ? (
            <p className="text-sm text-muted-foreground">No photos uploaded.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm text-dark">{value}</p>
    </div>
  );
}
