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
      <header className="absolute left-0 right-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <BrandLogo className="text-white" />
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="bg-white/90">
              <Link href="/login">Prihlásiť sa</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Vytvoriť účet</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative flex min-h-[82vh] items-end overflow-hidden pb-14 pt-28">
        <Image
          src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1800&q=85"
          alt="Elektrikár pri oprave rozvodnej skrine"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-dark/70" />
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

          <div className="rounded-lg border border-white/15 bg-white/95 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nová objednávka</p>
                <h2 className="text-xl font-semibold text-dark">Pretekajúci drez</h2>
              </div>
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-emerald-700">
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
                  className="flex items-center gap-3 rounded-md border bg-white p-3"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-dark">{String(label)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {steps.map((step, index) => (
          <div key={step} className="rounded-lg border bg-white p-5">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-emerald-700">
              {index + 1}
            </div>
            <p className="font-medium text-dark">{step}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
