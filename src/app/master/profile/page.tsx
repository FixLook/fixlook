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
          <CardTitle>Personal profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateProfileAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" defaultValue={profile.full_name} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile.email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={profile.city ?? "Kosice"} required />
            </div>
            <SubmitButton pendingText="Saving...">Save profile</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Professional profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateMasterProfileAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={master?.description ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly rate EUR</Label>
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
              Available for new jobs
            </label>
            <p className="text-sm text-muted-foreground">
              Verification status: {master?.verified ? "verified" : "waiting for admin"}
            </p>
            <SubmitButton pendingText="Saving...">Save professional profile</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
