import Link from "next/link";
import { acceptOrderAction, rejectOrderAction } from "@/actions/master";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const serviceIds = [...new Set((orders ?? []).map(order => order.service_id))];
  const { data: services } = serviceIds.length
    ? await supabase.from("services").select("id,name").in("id",serviceIds)
    : { data: [] };
  const serviceNames = new Map((services ?? []).map(service => [service.id,service.name]));
  const preferredCounts = new Map<string,number>();
  for (const order of orders ?? []) if (order.preferred_datetime && !["completed","cancelled"].includes(order.status)) {
    const key = new Date(order.preferred_datetime).toISOString();
    preferredCounts.set(key,(preferredCounts.get(key) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-dark">Pridelené zákazky</h1>
        <p className="mt-1 text-muted-foreground">
          Prijímajte zákazky, dohodnite cenu a spravujte priebeh práce.
        </p>
      </div>

      <div className="grid gap-4">
        {(orders ?? []).map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <CardTitle>{order.order_number}</CardTitle>
                  <p className="mt-1 text-sm font-medium">{serviceNames.get(order.service_id) ?? "Služba"} · {order.city}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDateTime(order.created_at)} - {formatCurrency(order.estimated_price)}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 rounded-lg bg-accent p-3 text-sm">
                <p><strong>Preferovaný termín:</strong> {formatDateTime(order.preferred_datetime)}</p>
                <p className="text-xs text-muted-foreground">Toto nie je rezervovaný čas. Záväzný termín musí potvrdiť zákazník.</p>
                {order.preferred_datetime && (preferredCounts.get(new Date(order.preferred_datetime).toISOString()) ?? 0) > 1 && <p role="status" className="font-semibold text-amber-800">Pozor: viacero zákaziek žiada rovnaký preferovaný čas. Pred prijatím skontrolujte kalendár.</p>}
              </div>
              <p className="text-sm text-dark">{order.problem_description}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/master/orders/${order.id}`}>Detail zákazky</Link>
                </Button>
                {order.status === "assigned" ? (
                  <>
                    <form action={acceptOrderAction}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <SubmitButton size="sm" pendingText="Prijímam…">
                        Prijať
                      </SubmitButton>
                    </form>
                    <form action={rejectOrderAction}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <SubmitButton size="sm" variant="outline" pendingText="Odmietam…">
                        Odmietnuť
                      </SubmitButton>
                    </form>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
        {!orders?.length ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Zatiaľ nemáte pridelené zákazky.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
