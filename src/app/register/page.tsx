import Link from "next/link";
import { signUpAction } from "@/actions/auth";
import { BrandLogo } from "@/components/brand-logo";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export default async function RegisterPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-accent px-4 py-10">
      <Card className="w-full max-w-xl bg-white">
        <CardHeader>
          <BrandLogo />
          <CardTitle className="pt-6">Create your FixLook account</CardTitle>
          <CardDescription>
            Start as a customer or register as a professional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signUpAction} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Notice error={params.error} message={params.message} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" autoComplete="name" required />
            </div>
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
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" autoComplete="tel" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue="Kosice" required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="role">Account type</Label>
              <Select id="role" name="role" defaultValue="customer">
                <option value="customer">Customer</option>
                <option value="master">Professional</option>
              </Select>
            </div>
            <SubmitButton className="sm:col-span-2" pendingText="Creating account...">
              Create account
            </SubmitButton>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-dark">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
