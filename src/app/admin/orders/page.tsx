import Link from "next/link";
import { assignMasterAction } from "@/actions/admin";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function AdminOrdersPage() {
  await requireProfile("admin");
  const supabase = await createServerSupabaseClient();
  const [{ data: orders }, { data: masterRows }] = await Promise.all([
    supabase.from("orders").select("*").order("created_at", { ascending: false }),
    supabase.from("masters").select("*").order("rating_avg", { ascending: false })
  ]);
  const masterIds = (masterRows ?? []).map((master) => master.profile_id);
  const { data: profiles } = masterIds.length
    ? await supabase.from("profiles").select("*").in("id", masterIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-dark">Správa objednávok</h1>
        <p className="mt-1 text-muted-foreground">
          Prideľujte overených majstrov a sledujte priebeh objednávok.
        </p>
      </div>

      <div className="grid gap-4">
        {(orders ?? []).map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <CardTitle><Link className="underline underline-offset-4" href={`/admin/orders/${order.id}`}>{order.order_number}</Link></CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {order.city} - {formatDateTime(order.created_at)} -{" "}
                    {formatCurrency(order.estimated_price)}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <div className="space-y-2">
                <p className="text-sm text-dark">{order.problem_description}</p>
                <p className="text-sm text-muted-foreground">
                  Pridelený majster:{" "}
                  {order.master_id
                    ? profileById.get(order.master_id)?.full_name ?? order.master_id
                    : "Zatiaľ nepridelené"}
                </p>
              </div>
              {["new", "assigned"].includes(order.status) ? <form action={assignMasterAction} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input type="hidden" name="orderId" value={order.id} />
                <div className="space-y-2">
                  <Label htmlFor={`master-${order.id}`}>Majster</Label>
                  <Select id={`master-${order.id}`} name="masterId" required>
                    {(masterRows ?? []).filter(master => master.verified && master.available).map((master) => {
                      const masterProfile = profileById.get(master.profile_id);
                      return (
                        <option key={master.profile_id} value={master.profile_id}>
                          {masterProfile?.full_name ?? master.profile_id}
                          {master.verified ? " – overený" : " – neoverený"}
                        </option>
                      );
                    })}
                  </Select>
                </div>
                <div className="flex items-end">
                  <SubmitButton disabled={!(masterRows ?? []).some(master => master.verified && master.available)} pendingText="Prideľujem…">Prideliť</SubmitButton>
                </div>
              </form> : <p className="text-sm text-muted-foreground">Majstra už v tomto stave nemožno zmeniť.</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
