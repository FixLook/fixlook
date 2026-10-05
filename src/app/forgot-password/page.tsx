import Link from "next/link";
import { requestPasswordResetAction } from "@/actions/auth";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";
export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-accent px-4"><Card className="w-full max-w-md"><CardHeader><BrandLogo /><CardTitle className="pt-4">Obnova hesla</CardTitle></CardHeader><CardContent className="space-y-4"><Notice {...params} /><form action={requestPasswordResetAction} className="space-y-4"><div><Label htmlFor="email">E-mail vášho účtu</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div><SubmitButton pendingText="Odosielam…">Poslať odkaz na obnovu</SubmitButton></form><Link href="/login" className="block text-sm text-primary-strong">Späť na prihlásenie</Link></CardContent></Card></main>;
}
