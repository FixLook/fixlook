import { reviewMasterVerificationAction, updateMasterVerificationAction } from "@/actions/admin";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/notice";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

const statusLabel: Record<string, string> = {
  pending: "Čaká na posúdenie",
  approved: "Schválená",
  needs_changes: "Vyžaduje doplnenie",
  rejected: "Zamietnutá"
};

export default async function AdminProfessionalsPage({
  searchParams
}: { searchParams: Promise<{ error?: string; message?: string }> }) {
  await requireProfile("admin");
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: masters } = await supabase.from("masters").select("*").order("created_at", { ascending: false });
  const ids = (masters ?? []).map(master => master.profile_id);
  const [{ data: profiles }, { data: applications }, { data: documents }] = await Promise.all([
    ids.length ? supabase.from("profiles").select("*").in("id", ids) : Promise.resolve({ data: [] }),
    supabase.from("master_verification_applications").select("*"),
    supabase.from("master_verification_documents").select("*")
  ]);
  const profileById = new Map((profiles ?? []).map(profile => [profile.id, profile]));
  const applicationById = new Map((applications ?? []).map(application => [application.master_id, application]));
  const filesWithLinks = await Promise.all((documents ?? []).map(async document => {
    const { data } = await supabase.storage.from("master-verification").createSignedUrl(document.storage_path, 60);
    return { ...document, url: data?.signedUrl ?? null };
  }));

  return <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold text-dark">Žiadosti a overovanie majstrov</h1>
      <p className="mt-1 text-muted-foreground">
        Registrácia je voľná. Nových majstrov schvaľujte až po kontrole ich žiadosti.
      </p>
    </div>
    <Notice error={params.error} message={params.message} />
    <div className="grid gap-4">
      {(masters ?? []).map(master => {
        const profile = profileById.get(master.profile_id);
        const application = applicationById.get(master.profile_id);
        const files = filesWithLinks.filter(doc => doc.master_id === master.profile_id);
        return <Card key={master.profile_id}>
          <CardHeader>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <CardTitle>{profile?.full_name ?? "Majster bez mena"}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {profile?.email} · {profile?.city ?? "Mesto neuvedené"} · {formatCurrency(master.hourly_rate)}
                </p>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={master.verified ? "verified" : "unverified"} />
                <StatusBadge status={master.available ? "available" : "offline"} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{master.description ?? "Majster zatiaľ nevyplnil popis."}</p>
            {!application ? (
              <p className="text-sm">Zatiaľ nebola podaná žiadosť o overenie.
                {master.verified ? " Majster bol schválený podľa pôvodného postupu." : " Čaká sa na podanie žiadosti."}
              </p>
            ) : <div className="space-y-3 rounded-xl border p-4">
              <p className="text-sm font-semibold">
                Stav žiadosti: {statusLabel[application.status] ?? application.status}
              </p>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="font-medium">Zameranie</dt><dd>{application.specialty}</dd></div>
                <div><dt className="font-medium">Prax</dt><dd>{application.years_experience} rokov</dd></div>
                <div><dt className="font-medium">IČO</dt><dd>{application.ico ?? "Nezadané"}</dd></div>
                <div><dt className="font-medium">Odoslané</dt><dd>{new Date(application.submitted_at).toLocaleDateString("sk-SK")}</dd></div>
              </dl>
              <p className="whitespace-pre-wrap text-sm">{application.motivation}</p>
              {application.references_text ? <p className="whitespace-pre-wrap text-sm">
                <strong>Referencie:</strong> {application.references_text}
              </p> : null}
              {files.length ? <div className="space-y-1">
                <p className="text-sm font-medium">Súkromné prílohy</p>
                {files.map(file => <p key={file.id} className="text-sm">
                  {file.url ? <a className="text-primary-strong underline" href={file.url}
                    target="_blank" rel="noopener noreferrer">{file.original_name}</a> : file.original_name}
                </p>)}
              </div> : null}
              {application.review_reason ? <p className="text-sm">
                <strong>Posledné rozhodnutie:</strong> {application.review_reason}
              </p> : null}
              {application.status === "pending" ? (
                <form action={reviewMasterVerificationAction} className="space-y-3 border-t pt-4">
                  <input type="hidden" name="masterId" value={master.profile_id} />
                  <div>
                    <Label htmlFor={`reason-${master.profile_id}`}>Odôvodnenie (povinné pri zamietnutí alebo doplnení)</Label>
                    <Textarea id={`reason-${master.profile_id}`} name="reason" maxLength={2000} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" name="decision" value="approved"
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Schváliť</button>
                    <button type="submit" name="decision" value="needs_changes"
                      className="rounded-lg border px-4 py-2 text-sm font-semibold">Vyžiadať doplnenie</button>
                    <button type="submit" name="decision" value="rejected"
                      className="rounded-lg border px-4 py-2 text-sm font-semibold text-red-700">Zamietnuť</button>
                  </div>
                </form>
              ) : null}
            </div>}
            {master.verified ? (
              <form action={updateMasterVerificationAction}>
                <input type="hidden" name="profileId" value={master.profile_id} />
                <input type="hidden" name="verified" value="true" />
                <SubmitButton variant="outline" pendingText="Ukladám…">Zrušiť overenie</SubmitButton>
              </form>
            ) : null}
          </CardContent>
        </Card>;
      })}
    </div>
  </div>;
}
