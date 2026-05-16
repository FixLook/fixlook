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
    <main className="flex min-h-screen items-center justify-center bg-accent px-4 py-10">
      <Card className="w-full max-w-md bg-white">
        <CardHeader>
          <BrandLogo />
          <CardTitle className="pt-6">Welcome back</CardTitle>
          <CardDescription>Log in to manage FixLook orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signInAction} className="space-y-4">
            <Notice error={params.error} message={params.message} />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <SubmitButton className="w-full" pendingText="Signing in...">
              Log in
            </SubmitButton>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/register" className="font-semibold text-dark">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
