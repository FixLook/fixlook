import { createServiceAction, toggleServiceAction } from "@/actions/admin";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export default async function AdminServicesPage() {
  await requireProfile("admin");
  const supabase = await createServerSupabaseClient();
  const { data: services } = await supabase
    .from("services")
    .select("*")
    .order("name", { ascending: true });

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Add service</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createServiceAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="basePrice">Base price EUR</Label>
              <Input id="basePrice" name="basePrice" type="number" min="1" step="0.01" required />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-dark">
              <input
                name="active"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              Active
            </label>
            <SubmitButton pendingText="Adding...">Add service</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {(services ?? []).map((service) => (
              <div
                key={service.id}
                className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-dark">{service.name}</p>
                    <StatusBadge status={service.active ? "active" : "inactive"} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatCurrency(service.base_price)} - {service.description}
                  </p>
                </div>
                <form action={toggleServiceAction}>
                  <input type="hidden" name="serviceId" value={service.id} />
                  <input type="hidden" name="active" value={String(service.active)} />
                  <SubmitButton variant="outline" pendingText="Saving...">
                    {service.active ? "Deactivate" : "Activate"}
                  </SubmitButton>
                </form>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
