import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, UploadCloud, WalletCards } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

const steps = [
  "Vyberte elektrikára alebo inštalatéra",
  "Opíšte problém a pridajte fotografie",
  "Schváľte presnú cenu a zaplaťte online",
  "Ohodnoťte dokončenú prácu"
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="relative z-20 border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <BrandLogo />
          <nav aria-label="Účet" className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/login">Prihlásiť sa</Link>
            </Button>
            <Button asChild className="hidden sm:inline-flex">
              <Link href="/register">Vytvoriť účet</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="relative flex min-h-[72vh] items-center overflow-hidden bg-dark py-16 sm:py-24">
        <Image
          src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1800&q=85"
          alt="Elektrikár pri oprave rozvodnej skrine"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-dark via-dark/90 to-dark/65" />
        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="max-w-3xl text-white">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary">
              Začíname v Košiciach
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-6xl">
              Spoľahlivý majster. Dohodnutá cena. Bez obvolávania.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-100">
              Opíšte problém, dohodnite si podrobnosti v chate a schváľte cenu od overeného majstra. Práce navyše vždy potvrdíte vopred.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/register">
                  Vytvoriť účet <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white/95">
                <Link href="/login">Prejsť do účtu</Link>
              </Button>
            </div>
          </div>

          <div className="self-center rounded-2xl border border-primary/25 bg-white p-5 shadow-2xl sm:p-7">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nová objednávka</p>
                <h2 className="text-xl font-semibold text-dark">Pretekajúci drez</h2>
              </div>
              <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-strong">
                Inštalatér
              </span>
            </div>
            <div className="space-y-3">
              {[
                ["Priložené fotografie", UploadCloud],
                ["Priradenie overeného majstra", CheckCircle2],
                ["Cena schválená zákazníkom", WalletCards]
              ].map(([label, Icon]) => (
                <div
                  key={String(label)}
                  className="flex items-center gap-3 rounded-xl border border-primary/15 bg-primary-soft/60 p-3"
                >
                  <Icon className="h-5 w-5 shrink-0 text-primary-strong" />
                  <span className="text-sm font-medium text-dark">{String(label)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Ako FixLook funguje" className="mx-auto grid max-w-7xl gap-4 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {steps.map((step, index) => (
          <div key={step} className="rounded-2xl border bg-accent p-5">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {index + 1}
            </div>
            <p className="font-medium text-dark">{step}</p>
          </div>
        ))}
      </section>
      <footer className="border-t bg-accent">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <BrandLogo />
          <p className="text-sm text-muted-foreground">Dohodnutá cena. Priamy kontakt. Pomoc pre váš domov.</p>
        </div>
      </footer>
    </div>
  );
}
