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
        <h1 className="text-3xl font-bold text-dark">Payments</h1>
        <p className="mt-1 text-muted-foreground">
          Track Stripe payment status, commission, and professional payout.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-3">Order</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Amount</th>
                  <th className="py-3">Commission</th>
                  <th className="py-3">Master amount</th>
                  <th className="py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(payments ?? []).map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-3 font-medium text-dark">{payment.order_id}</td>
                    <td className="py-3">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="py-3">{formatCurrency(payment.amount)}</td>
                    <td className="py-3">{formatCurrency(payment.commission_amount)}</td>
                    <td className="py-3">{formatCurrency(payment.master_amount)}</td>
                    <td className="py-3">{formatDateTime(payment.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!payments?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No payments yet.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
