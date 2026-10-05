import { createServiceAction, toggleServiceAction, updateServiceAction } from "@/actions/admin";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatEstimate } from "@/lib/utils";

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
          <CardTitle>Pridať službu</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createServiceAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Názov</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Popis</Label>
              <Textarea id="description" name="description" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="basePrice">Orientačná cena od (€)</Label>
              <Input id="basePrice" name="basePrice" type="number" min="0" step="0.01" required />
            </div>
            <div className="space-y-2"><Label htmlFor="estimateMax">Orientačná cena do (€, nepovinné)</Label><Input id="estimateMax" name="estimateMax" type="number" min="0" step="0.01" /></div>
            <p className="text-sm text-muted-foreground">Ceny slúžia iba ako orientačný odhad. Konkrétnu ponuku schvaľuje zákazník pri objednávke.</p>
            <label className="flex items-center gap-2 text-sm font-medium text-dark">
              <input
                name="active"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              Aktívna
            </label>
            <SubmitButton pendingText="Pridávam…">Pridať službu</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Služby</CardTitle>
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
                    {formatEstimate(service.base_price, service.estimate_max)} - {service.description}
                  </p>
                  <details className="mt-3"><summary className="cursor-pointer text-sm font-medium text-emerald-800">Upraviť službu a ceny</summary><form action={updateServiceAction} className="mt-3 space-y-3">
                    <input type="hidden" name="serviceId" value={service.id} />
                    <div><Label htmlFor={`name-${service.id}`}>Názov</Label><Input id={`name-${service.id}`} name="name" defaultValue={service.name} required /></div>
                    <div><Label htmlFor={`description-${service.id}`}>Popis</Label><Textarea id={`description-${service.id}`} name="description" defaultValue={service.description ?? ""} /></div>
                    <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor={`min-${service.id}`}>Odhad od (€)</Label><Input id={`min-${service.id}`} name="basePrice" type="number" min="0" step="0.01" defaultValue={service.base_price / 100} required /></div><div><Label htmlFor={`max-${service.id}`}>Odhad do (€)</Label><Input id={`max-${service.id}`} name="estimateMax" type="number" min="0" step="0.01" defaultValue={service.estimate_max === null ? "" : service.estimate_max / 100} /></div></div>
                    <label className="flex gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={service.active} /> Aktívna služba</label><SubmitButton>Uložiť zmeny</SubmitButton>
                  </form></details>
                </div>
                <form action={toggleServiceAction}>
                  <input type="hidden" name="serviceId" value={service.id} />
                  <input type="hidden" name="active" value={String(service.active)} />
                  <SubmitButton variant="outline" pendingText="Ukladám…">
                    {service.active ? "Deaktivovať" : "Aktivovať"}
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
