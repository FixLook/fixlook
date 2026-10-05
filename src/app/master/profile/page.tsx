import { updateMasterProfileAction } from "@/actions/master";
import { updateProfileAction } from "@/actions/profile";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function MasterProfilePage() {
  const profile = await requireProfile("master");
  const supabase = await createServerSupabaseClient();
  const { data: master } = await supabase
    .from("masters")
    .select("*")
    .eq("profile_id", profile.id)
    .single();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Osobné údaje</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateProfileAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Meno a priezvisko</Label>
              <Input id="fullName" name="fullName" defaultValue={profile.full_name} required />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={profile.email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefón</Label>
              <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Mesto</Label>
              <Input id="city" name="city" defaultValue={profile.city ?? "Košice"} required />
            </div>
            <SubmitButton pendingText="Ukladám…">Uložiť profil</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profil majstra</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateMasterProfileAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Popis</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={master?.description ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hodinová sadzba (€)</Label>
              <Input
                id="hourlyRate"
                name="hourlyRate"
                type="number"
                min="1"
                step="0.01"
                defaultValue={master?.hourly_rate ? master.hourly_rate / 100 : ""}
                required
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-dark">
              <input
                name="available"
                type="checkbox"
                defaultChecked={master?.available ?? false}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              Som dostupný pre nové zákazky
            </label>
            <p className="text-sm text-muted-foreground">
              Stav overenia: {master?.verified ? "Overený" : "Čaká na overenie administrátorom"}
            </p>
            <SubmitButton pendingText="Ukladám…">Uložiť profil majstra</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
