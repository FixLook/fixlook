import Link from "next/link";
import { signUpAction } from "@/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export default async function RegisterPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string; role?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Začnime spolu."
      description="Vytvorte si účet. Objednávajte opravy ako zákazník alebo sa pridajte ako majster."
      footer={
        <>
          Už máte účet?{" "}
          <Link href="/login" className="font-semibold text-primary-strong hover:underline">
            Prihlásiť sa
          </Link>
        </>
      }
    >
      <form action={signUpAction} className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Notice error={params.error} message={params.message} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="fullName">Meno a priezvisko</Label>
          <Input id="fullName" name="fullName" autoComplete="name" required />
        </div>
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
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefón</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Mesto</Label>
          <Input
            id="city"
            name="city"
            defaultValue="Košice"
            autoComplete="address-level2"
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="role">Typ účtu</Label>
          <Select
            id="role"
            name="role"
            defaultValue={params.role === "master" ? "master" : "customer"}
          >
            <option value="customer">Zákazník</option>
            <option value="master">Majster</option>
          </Select>
        </div>
        <SubmitButton className="sm:col-span-2" size="lg" pendingText="Vytváram účet…">
          Vytvoriť účet
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
