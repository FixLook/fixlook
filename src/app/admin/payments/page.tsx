import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function AdminPaymentsPage() {
  await requireProfile("admin");
  const supabase = await createServerSupabaseClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-dark">Platby</h1>
        <p className="mt-1 text-muted-foreground">
          Prehľad platieb, provízií a podielov majstrov. Podiel je výpočet, nie potvrdenie vyplatenia.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Záznamy platieb</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-3">Objednávka</th>
                  <th className="py-3">Stav</th>
                  <th className="py-3">Suma</th>
                  <th className="py-3">Vrátené</th>
                  <th className="py-3">Provízia po vrátení</th>
                  <th className="py-3">Podiel majstra</th>
                  <th className="py-3">Vytvorené</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(payments ?? []).map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-3 font-medium text-dark"><Link className="underline" href={`/admin/orders/${payment.order_id}`}>Detail objednávky</Link></td>
                    <td className="py-3">
                      <StatusBadge status={payment.refunded_amount > 0 && payment.refunded_amount < payment.amount ? "partially_refunded" : payment.status} />
                    </td>
                    <td className="py-3">{formatCurrency(payment.amount)}</td>
                    <td className="py-3">{formatCurrency(payment.refunded_amount)}</td>
                    <td className="py-3">{formatCurrency(Math.round((payment.amount - payment.refunded_amount) * 0.2))}</td>
                    <td className="py-3">{formatCurrency(payment.amount - payment.refunded_amount - Math.round((payment.amount - payment.refunded_amount) * 0.2))}</td>
                    <td className="py-3">{formatDateTime(payment.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!payments?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Zatiaľ neboli zaznamenané platby.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
