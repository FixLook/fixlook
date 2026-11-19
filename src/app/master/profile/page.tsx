import { updateMasterProfileAction } from "@/actions/master";
import { submitMasterVerificationAction } from "@/actions/verification";
import { updateProfileAction } from "@/actions/profile";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@/components/notice";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function MasterProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  const profile = await requireProfile("master");
  const supabase = await createServerSupabaseClient();
  const { data: master } = await supabase
    .from("masters")
    .select("*")
    .eq("profile_id", profile.id)
    .single();

  const { data: application } = await supabase.from("master_verification_applications")
    .select("*").eq("master_id", profile.id).maybeSingle();
  const { data: documents } = await supabase.from("master_verification_documents")
    .select("storage_path,original_name,id").eq("master_id", profile.id).order("uploaded_at");
  const links = await Promise.all((documents ?? []).map(async document => {
    const { data } = await supabase.storage.from("master-verification")
      .createSignedUrl(document.storage_path, 60);
    return { ...document, url: data?.signedUrl ?? null };
  }));
  const maySubmit = !master?.verified && (!application || application.status === "needs_changes" || application.status === "rejected");

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
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Žiadosť o overenie majstra</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <Notice error={params.error} message={params.message} />
          <p className="text-sm text-muted-foreground">
            Registrácia je nezáväzná. Až po schválení administrátorom môžete dostávať objednávky.
            Životopis nie je povinný. Údaje posudzujeme iba na účely overenia odbornosti.
          </p>
          <p className="text-sm font-semibold">
            Stav žiadosti: {master?.verified ? "Overený majster" :
              application?.status === "pending" ? "Čaká na kontrolu" :
              application?.status === "needs_changes" ? "Potrebné doplnenie" :
              application?.status === "rejected" ? "Zamietnutá – môžete požiadať znova" :
              "Žiadosť ešte nebola odoslaná"}
          </p>
          {application?.review_reason && !master?.verified ? (
            <p className="rounded-lg border bg-accent p-3 text-sm">Vyjadrenie administrátora: {application.review_reason}</p>
          ) : null}
          {links.length ? <div className="space-y-2">
            <p className="text-sm font-medium">Priložené dokumenty</p>
            {links.map(document => <p key={document.id} className="text-sm">
              {document.url ? <a href={document.url} target="_blank" rel="noopener noreferrer" className="text-primary-strong underline">
                {document.original_name}</a> : document.original_name}
            </p>)}
          </div> : null}
          {maySubmit ? (
            <form action={submitMasterVerificationAction} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="specialty">Odborné zameranie</Label>
                <Input id="specialty" name="specialty" required minLength={2} maxLength={160}
                  defaultValue={application?.specialty ?? ""} placeholder="Napr. elektrikár, inštalatér" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearsExperience">Roky praxe</Label>
                <Input id="yearsExperience" name="yearsExperience" type="number" min={0} max={70}
                  defaultValue={application?.years_experience ?? 0} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ico">IČO (ak máte)</Label>
                <Input id="ico" name="ico" maxLength={8} inputMode="numeric"
                  defaultValue={application?.ico ?? ""} placeholder="Nepovinné" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="document">Doklad, certifikát alebo referencia (nepovinné)</Label>
                <Input id="document" name="document" type="file" accept=".pdf,.jpg,.jpeg,.png" />
                <p className="text-xs text-muted-foreground">PDF, JPG alebo PNG, najviac 3 MB.</p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="referencesText">Referencie (nepovinné)</Label>
                <Textarea id="referencesText" name="referencesText"
                  defaultValue={application?.references_text ?? ""} maxLength={2000} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="motivation">Predstavenie a skúsenosti</Label>
                <Textarea id="motivation" name="motivation" required minLength={20} maxLength={4000}
                  defaultValue={application?.motivation ?? ""} />
              </div>
              <SubmitButton pendingText="Odosielam žiadosť…" className="sm:col-span-2">
                {application ? "Opätovne odoslať žiadosť" : "Požiadať o overenie"}
              </SubmitButton>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
