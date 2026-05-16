import Link from "next/link";
import { acceptOrderAction, completeOrderAction, rejectOrderAction } from "@/actions/master";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function MasterOrdersPage() {
  const profile = await requireProfile("master");
  const supabase = await createServerSupabaseClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("master_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-dark">Assigned orders</h1>
        <p className="mt-1 text-muted-foreground">
          Accept jobs, track paid work, and mark completed orders.
        </p>
      </div>

      <div className="grid gap-4">
        {(orders ?? []).map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <CardTitle>{order.order_number}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDateTime(order.created_at)} - {formatCurrency(order.estimated_price)}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-dark">{order.problem_description}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/master/orders/${order.id}`}>Open detail</Link>
                </Button>
                {order.status === "assigned" ? (
                  <>
                    <form action={acceptOrderAction}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <SubmitButton size="sm" pendingText="Accepting...">
                        Accept
                      </SubmitButton>
                    </form>
                    <form action={rejectOrderAction}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <SubmitButton size="sm" variant="outline" pendingText="Rejecting...">
                        Reject
                      </SubmitButton>
                    </form>
                  </>
                ) : null}
              </div>
              {order.status === "in_progress" ? (
                <form action={completeOrderAction} className="grid gap-3 sm:grid-cols-[160px_auto]">
                  <input type="hidden" name="orderId" value={order.id} />
                  <div className="space-y-2">
                    <Label htmlFor={`finalPrice-${order.id}`}>Final price EUR</Label>
                    <Input
                      id={`finalPrice-${order.id}`}
                      name="finalPrice"
                      type="number"
                      min="1"
                      step="0.01"
                      defaultValue={(order.estimated_price ?? 0) / 100}
                    />
                  </div>
                  <div className="flex items-end">
                    <SubmitButton pendingText="Completing...">Complete order</SubmitButton>
                  </div>
                </form>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {!orders?.length ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No assigned orders yet.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
