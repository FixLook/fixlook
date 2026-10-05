"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="mx-auto max-w-xl space-y-4 px-4 py-20"><h1 className="text-2xl font-bold">Stránku sa nepodarilo načítať</h1><p>Skúste to znova. Ak problém pretrváva, kontaktujte podporu FixLook.</p><div className="flex gap-4"><Button onClick={reset}>Skúsiť znova</Button><Link href="/" className="self-center underline">Úvodná stránka</Link></div></main>; }
