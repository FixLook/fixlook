import { updatePasswordAction } from "@/actions/auth";
import { getCurrentProfile } from "@/lib/auth";
import { redirectWithError } from "@/lib/form";
import { AuthShell } from "@/components/auth-shell";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function Page({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  if (!(await getCurrentProfile()))
    redirectWithError("/forgot-password", "Otvorte platný odkaz na obnovu hesla z e-mailu.");
  const params = await searchParams;
  return (
    <AuthShell
      title="Nastavte si nové heslo."
      description="Použite aspoň 8 znakov a heslo zopakujte pre potvrdenie."
    >
      <Notice {...params} />
      <form action={updatePasswordAction} className="mt-5 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password">Nové heslo</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Zopakujte heslo</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
          />
        </div>
        <SubmitButton size="lg" className="w-full">
          Uložiť nové heslo
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
