import { updateMasterVerificationAction } from "@/actions/admin";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export default async function AdminProfessionalsPage() {
  await requireProfile("admin");
  const supabase = await createServerSupabaseClient();
  const { data: masters } = await supabase
    .from("masters")
    .select("*")
    .order("created_at", { ascending: false });
  const ids = (masters ?? []).map((master) => master.profile_id);
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("*").in("id", ids)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-dark">Správa majstrov</h1>
        <p className="mt-1 text-muted-foreground">
          Overujte majstrov a spravujte ich dostupnosť.
        </p>
      </div>

      <div className="grid gap-4">
        {(masters ?? []).map((master) => {
          const profile = profileById.get(master.profile_id);

          return (
            <Card key={master.profile_id}>
              <CardHeader>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <CardTitle>{profile?.full_name ?? "Majster bez mena"}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {profile?.email} - {formatCurrency(master.hourly_rate)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <StatusBadge status={master.verified ? "verified" : "unverified"} />
                    <StatusBadge status={master.available ? "available" : "offline"} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <p className="max-w-2xl text-sm text-muted-foreground">
                  {master.description ?? "Majster zatiaľ nevyplnil popis."}
                </p>
                <form action={updateMasterVerificationAction}>
                  <input type="hidden" name="profileId" value={master.profile_id} />
                  <input type="hidden" name="verified" value={String(master.verified)} />
                  <SubmitButton variant="outline" pendingText="Ukladám…">
                    {master.verified ? "Zrušiť overenie" : "Overiť"}
                  </SubmitButton>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
