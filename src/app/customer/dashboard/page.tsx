import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Database } from "@/lib/database.types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

export default async function CustomerDashboardPage() {
  const profile = await requireProfile("customer");
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", profile.id)
    .order("created_at", { ascending: false })
    ;
  const orders = (data ?? []) as Order[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-dark">Moje objednávky</h1>
          <p className="mt-1 text-muted-foreground">
            Všetky vaše objednávky, schválené ceny a stav riešenia na jednom mieste.
          </p>
        </div>
        <Button asChild>
          <Link href="/customer/orders/new">
            <Plus className="h-4 w-4" /> Nová objednávka
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Počet objednávok" value={orders.length} />
        <StatCard
          label="Otvorené objednávky"
          value={orders.filter((order) => !["completed", "cancelled"].includes(order.status)).length}
        />
        <StatCard
          label="Dokončené"
          value={orders.filter((order) => order.status === "completed").length}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vaše objednávky</CardTitle>
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
                        <Link href={`/customer/orders/${order.id}`}>Otvoriť</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!orders.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Zatiaľ nemáte žiadne objednávky.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
