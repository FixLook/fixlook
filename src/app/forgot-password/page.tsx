import Link from "next/link";
import { requestPasswordResetAction } from "@/actions/auth";
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
  const params = await searchParams;
  return (
    <AuthShell
      title="Zabudli ste heslo?"
      description="Zadajte e-mail svojho účtu. Pošleme vám odkaz, cez ktorý si nastavíte nové heslo."
      footer={
        <Link href="/login" className="font-semibold text-primary-strong hover:underline">
          Späť na prihlásenie
        </Link>
      }
    >
      <Notice {...params} />
      <form action={requestPasswordResetAction} className="mt-5 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail vášho účtu</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <SubmitButton size="lg" className="w-full" pendingText="Odosielam…">
          Poslať odkaz na obnovu
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
