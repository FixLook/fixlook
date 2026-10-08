import Link from "next/link";
import { ArrowLeft, BadgeCheck, MessageCircle, WalletCards } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export function AuthShell({
  title,
  description,
  children,
  footer
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-accent px-5 pb-10 sm:px-8 sm:pb-16">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 py-5 sm:py-7">
        <BrandLogo />
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-slate-600 hover:text-dark"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Späť na úvod
        </Link>
      </header>
      <main className="mx-auto grid max-w-6xl overflow-hidden rounded-3xl border bg-white shadow-card lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="hidden flex-col justify-between bg-dark p-10 text-white lg:flex xl:p-12">
          <div>
            <span className="inline-flex rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-300">
              Pomoc pre váš domov
            </span>
            <h2 className="mt-10 text-4xl font-semibold leading-tight tracking-tight">
              Dobrý majster.
              <br />
              <span className="text-primary">O starosť menej.</span>
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-slate-300">
              Od prvej správy po dokončenú opravu. Všetky dohody máte na jednom mieste.
            </p>
            <div className="mt-10 space-y-6">
              {[
                {
                  icon: BadgeCheck,
                  title: "Overení majstri",
                  description: "Pomoc s elektrikárskymi a inštalatérskymi prácami."
                },
                {
                  icon: WalletCards,
                  title: "Cena dohodnutá vopred",
                  description: "Konkrétnu ponuku potvrdzujete pred platbou."
                },
                {
                  icon: MessageCircle,
                  title: "Priama komunikácia",
                  description: "Podrobnosti si dohodnete v chate."
                }
              ].map((item) => (
                <div key={item.title} className="flex gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-primary">
                    <item.icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-12 text-xs text-slate-400">FixLook · Začíname v Košiciach</p>
        </aside>
        <section className="px-6 py-8 sm:p-10 xl:p-12">
          <div className="mx-auto max-w-lg">
            <h1 className="text-2xl font-semibold tracking-tight text-dark sm:text-3xl">{title}</h1>
            <p className="mb-8 mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
            {children}
            {footer && (
              <div className="mt-7 border-t pt-6 text-center text-sm text-muted-foreground">
                {footer}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
