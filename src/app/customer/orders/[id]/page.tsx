import Link from "next/link";
import Image from "next/image";
import { createCheckoutSessionAction } from "@/actions/payments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function CustomerOrderDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile("customer");
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("customer_id", profile.id)
    .single();

  if (!order) {
    return <p className="text-sm text-muted-foreground">Order was not found.</p>;
  }

  const [{ data: service }, { data: master }, { data: photos }] = await Promise.all([
    supabase.from("services").select("*").eq("id", order.service_id).single(),
    order.master_id
      ? supabase.from("profiles").select("*").eq("id", order.master_id).single()
      : Promise.resolve({ data: null }),
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

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Order details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Detail label="Issue" value={order.problem_description} />
            <Detail label="Address" value={`${order.address}, ${order.city}`} />
            <Detail label="Preferred time" value={formatDateTime(order.preferred_datetime)} />
            <Detail label="Estimated price" value={formatCurrency(order.estimated_price)} />
            <Detail label="Final price" value={formatCurrency(order.final_price)} />
            <Detail label="Payment" value={order.stripe_payment_status ?? "not paid"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Professional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {master ? (
              <>
                <Detail label="Name" value={master.full_name} />
                <Detail label="Phone" value={master.phone ?? "-"} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Admin has not assigned a professional yet.
              </p>
            )}
            {order.status === "accepted" ? (
              <form action={createCheckoutSessionAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <SubmitButton className="w-full" pendingText="Opening Stripe...">
                  Pay online
                </SubmitButton>
              </form>
            ) : null}
            {order.status === "completed" ? (
              <Button asChild className="w-full">
                <Link href="/customer/ratings">Rate this job</Link>
              </Button>
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
