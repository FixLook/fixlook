import Link from "next/link";
import { signInAction } from "@/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Vitajte späť."
      description="Prihláste sa a pokračujte tam, kde ste skončili."
      footer={
        <>
          Ešte nemáte účet?{" "}
          <Link href="/register" className="font-semibold text-primary-strong hover:underline">
            Vytvoriť účet
          </Link>
        </>
      }
    >
      <form action={signInAction} className="space-y-5">
        <Notice error={params.error} message={params.message} />
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Heslo</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <SubmitButton className="w-full" size="lg" pendingText="Prihlasujem…">
          Prihlásiť sa
        </SubmitButton>
      </form>
      <Link
        href="/forgot-password"
        className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-primary-strong hover:underline"
      >
        Zabudli ste heslo?
      </Link>
    </AuthShell>
  );
}
