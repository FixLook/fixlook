import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Database } from "@/lib/database.types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

export default async function MasterDashboardPage() {
  const profile = await requireProfile("master");
  const supabase = await createServerSupabaseClient();
  const [{ data: ordersData }, { data: master }] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .eq("master_id", profile.id)
      .order("created_at", { ascending: false })
      ,
    supabase.from("masters").select("*").eq("profile_id", profile.id).single()
  ]);
  const orders = (ordersData ?? []) as Order[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-dark">Prehľad majstra</h1>
        <p className="mt-1 text-muted-foreground">
          Sledujte pridelené zákazky a aktualizujte svoju dostupnosť.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pridelené zákazky" value={orders.length} />
        <StatCard
          label="Prijaté"
          value={orders.filter((order) => order.status === "accepted").length}
        />
        <StatCard
          label="Dokončené"
          value={orders.filter((order) => order.status === "completed").length}
        />
        <StatCard label="Hodnotenie" value={master?.rating_avg?.toFixed(1) ?? "0.0"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Najnovšie zákazky</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-3">Objednávka</th>
                  <th className="py-3">Stav</th>
                  <th className="py-3">Orientačná cena</th>
                  <th className="py-3">Vytvorené</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-3 font-medium text-dark">{order.order_number}</td>
                    <td className="py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3">{formatCurrency(order.estimated_price)}</td>
                    <td className="py-3">{formatDateTime(order.created_at)}</td>
                    <td className="py-3 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/master/orders/${order.id}`}>Otvoriť</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!orders.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Zatiaľ nemáte pridelené zákazky.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
