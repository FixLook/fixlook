import Link from "next/link";
import { signInAction } from "@/actions/auth";
import { BrandLogo } from "@/components/brand-logo";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-soft via-accent to-white px-4 py-10">
      <Card className="w-full max-w-md bg-white">
        <CardHeader>
          <BrandLogo />
          <CardTitle className="pt-6">Vitajte späť</CardTitle>
          <CardDescription>Prihláste sa a spravujte svoje objednávky.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signInAction} className="space-y-4">
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
            <SubmitButton className="w-full" pendingText="Prihlasujem…">
              Prihlásiť sa
            </SubmitButton>
          </form>
          <Link href="/forgot-password" className="mt-4 block text-sm text-primary-strong">Zabudli ste heslo?</Link>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Ešte nemáte účet?{" "}
            <Link href="/register" className="font-semibold text-dark">
              Zaregistrujte sa
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
