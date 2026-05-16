import { createOrderAction } from "@/actions/orders";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export default async function NewOrderPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  await requireProfile("customer");
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .order("name");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-dark">New order</h1>
        <p className="mt-1 text-muted-foreground">
          Tell FixLook what is wrong and attach up to five photos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Issue details</CardTitle>
          <CardDescription>
            Admin will manually assign a verified professional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createOrderAction} className="space-y-5">
            <Notice error={params.error} message={params.message} />
            <div className="space-y-2">
              <Label htmlFor="serviceId">Service</Label>
              <Select id="serviceId" name="serviceId" required>
                {(services ?? []).map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - {formatCurrency(service.base_price)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="problemDescription">Problem description</Label>
              <Textarea
                id="problemDescription"
                name="problemDescription"
                placeholder="Example: Kitchen sink is leaking under the cabinet."
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" defaultValue="Kosice" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferredDatetime">Preferred date and time</Label>
              <Input id="preferredDatetime" name="preferredDatetime" type="datetime-local" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="photos">Photos</Label>
              <Input id="photos" name="photos" type="file" accept="image/*" multiple />
            </div>
            <SubmitButton pendingText="Creating order...">Submit order</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
