import { updatePasswordAction } from "@/actions/auth";
import { getCurrentProfile } from "@/lib/auth";
import { redirectWithError } from "@/lib/form";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  if (!await getCurrentProfile()) redirectWithError("/forgot-password", "Otvorte platný odkaz na obnovu hesla z e-mailu.");
  const params = await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-accent px-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Nastaviť nové heslo</CardTitle></CardHeader><CardContent className="space-y-4"><Notice {...params} /><form action={updatePasswordAction} className="space-y-4"><div><Label htmlFor="password">Nové heslo</Label><Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></div><div><Label htmlFor="confirmPassword">Zopakujte heslo</Label><Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></div><SubmitButton>Uložiť nové heslo</SubmitButton></form></CardContent></Card></main>;
}
