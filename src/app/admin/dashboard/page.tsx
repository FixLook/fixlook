import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function AdminDashboardPage() {
  await requireProfile("admin");
  const supabase = await createServerSupabaseClient();
  const [{ data: orders, count: orderCount }, { data: payments }, { data: masters }] =
    await Promise.all([
      supabase.from("orders").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(8),
      supabase.from("payments").select("*").eq("status", "paid"),
      supabase.from("masters").select("*").eq("available", true).eq("verified", true)
    ]);

  const revenue = (payments ?? []).reduce((total, payment) => total + payment.amount - payment.refunded_amount, 0);
  const commission = (payments ?? []).reduce(
    (total, payment) => total + Math.round((payment.amount - payment.refunded_amount) * 0.2),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-dark">Administrácia</h1>
        <p className="mt-1 text-muted-foreground">
          Prehľad objednávok, platieb a dostupných majstrov.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Počet objednávok" value={orderCount ?? 0} />
        <StatCard label="Prijaté platby" value={formatCurrency(revenue)} />
        <StatCard label="Provízia spolu" value={formatCurrency(commission)} />
        <StatCard label="Dostupní majstri" value={masters?.length ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Najnovšie objednávky</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-3">Objednávka</th>
                  <th className="py-3">Stav</th>
                  <th className="py-3">Mesto</th>
                  <th className="py-3">Vytvorené</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {(orders ?? []).map((order) => (
                  <tr key={order.id}>
                    <td className="py-3 font-medium text-dark">{order.order_number}</td>
                    <td className="py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3">{order.city}</td>
                    <td className="py-3">{formatDateTime(order.created_at)}</td>
                    <td className="py-3 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/orders/${order.id}`}>Spravovať</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
