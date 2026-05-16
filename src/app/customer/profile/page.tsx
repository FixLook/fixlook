import { updateProfileAction } from "@/actions/profile";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireProfile } from "@/lib/auth";

export default async function CustomerProfilePage() {
  const profile = await requireProfile("customer");

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
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
    </div>
  );
}
