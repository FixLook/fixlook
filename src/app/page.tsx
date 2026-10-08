import Link from "next/link";
import Image from "next/image";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Droplets,
  MapPin,
  MessageCircle,
  ShieldCheck,
  WalletCards,
  Wrench,
  Zap
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

const services = [
  {
    name: "Elektrikár",
    icon: Zap,
    category: "Keď to doma nefunguje",
    description:
      "Zásuvky, osvetlenie, vypínače či poruchy elektroinštalácie. Opíšte problém a dohodnite opravu s majstrom.",
    examples: ["Zásuvky a vypínače", "Svetlá a zapojenie", "Elektrické poruchy"],
    color: "bg-amber-50 text-amber-800"
  },
  {
    name: "Inštalatér",
    icon: Droplets,
    category: "Keď voda tečie, kam nemá",
    description:
      "Kvapkajúci kohútik, pretekajúci drez alebo problém s odtokom. Nájdite pomoc bez zdĺhavého obvolávania.",
    examples: ["Batérie a umývadlá", "Úniky vody", "Odtoky a sifóny"],
    color: "bg-primary-soft text-primary-strong"
  }
];

const steps = [
  {
    title: "Opíšte, čo treba opraviť",
    description: "Vyberte službu, pridajte popis, adresu a fotografie problému."
  },
  {
    title: "Dohodnite sa s majstrom",
    description: "Pridelíme vám overeného majstra. Podrobnosti aj termín si prejdete v chate."
  },
  {
    title: "Potvrďte cenu",
    description: "Majster pripraví konkrétnu ponuku. Po vašom schválení ju zaplatíte online."
  },
  {
    title: "Ohodnoťte prácu",
    description: "Po dokončení zákazky dajte vedieť, ako ste boli s opravou spokojní."
  }
];

const questions = [
  {
    question: "Ako sa určí cena opravy?",
    answer:
      "Pri objednávke vidíte orientačný odhad. Majster následne posúdi problém a pripraví ponuku s cenou práce, materiálu a dopravy. Presnú cenu schválite pred platbou. Ak ponuka nevyhovuje, môžete ju odmietnuť a požiadať o úpravu."
  },
  {
    question: "Čo ak sa objavia práce navyše?",
    answer:
      "Majster vám pošle samostatnú ponuku s popisom a cenou ďalších prác. Práce navyše sa vykonajú až po vašom schválení a úhrade."
  },
  {
    question: "Môžem si s majstrom písať?",
    answer:
      "Áno. Každá objednávka má vlastný chat, v ktorom si dohodnete rozsah, termín a ďalšie podrobnosti. Správy nájdete priamo vo svojom účte."
  },
  {
    question: "Kde je FixLook dostupný?",
    answer:
      "Začíname v Košiciach s elektrikárskymi a inštalatérskymi službami. Počas testovacej prevádzky slúži web na vyskúšanie objednávok a platieb; reálne výjazdy sa zatiaľ neuskutočňujú."
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <a
        href="#obsah"
        className="sr-only z-50 rounded-xl bg-dark px-5 py-3 text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Prejsť na obsah
      </a>
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:py-5">
          <BrandLogo />
          <nav
            aria-label="Úvodná stránka"
            className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex"
          >
            <Link href="#sluzby" className="transition-colors hover:text-dark">
              Služby
            </Link>
            <Link href="#ako-to-funguje" className="transition-colors hover:text-dark">
              Ako to funguje
            </Link>
            <Link href="#preco-fixlook" className="transition-colors hover:text-dark">
              Prečo FixLook
            </Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button asChild variant="ghost" className="px-3">
              <Link href="/login">Prihlásiť sa</Link>
            </Button>
            <Button asChild variant="dark" className="hidden sm:inline-flex">
              <Link href="/register">
                Začať s FixLook <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="obsah">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:pb-24 lg:pt-20">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-accent px-3.5 py-2 text-xs font-medium text-slate-600 sm:mb-8">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-primary-strong" />
              Pomoc pre váš domov · Košice
            </div>
            <h1 className="max-w-2xl text-[2.65rem] font-semibold leading-[1.08] tracking-[-0.055em] text-dark sm:text-6xl xl:text-[4.5rem]">
              Dobrý majster.
              <br />
              <span className="text-sky-600">O starosť menej.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-600 sm:mt-7 sm:text-lg">
              Domáce opravy vybavíte na jednom mieste. Nájdite pomoc, dohodnite podrobnosti a
              schváľte cenu, s ktorou súhlasíte.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/register">
                  Potrebujem majstra <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="justify-center"
              >
                <Link href="#ako-to-funguje">
                  Ako to funguje <ArrowDown aria-hidden="true" className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium text-slate-600 sm:mt-10 sm:text-sm">
              <span className="flex items-center gap-2">
                <BadgeCheck aria-hidden="true" className="h-4 w-4 text-primary-strong" /> Overení
                majstri
              </span>
              <span className="flex items-center gap-2">
                <WalletCards aria-hidden="true" className="h-4 w-4 text-primary-strong" /> Cena
                schválená vopred
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg pb-20 lg:pb-16 lg:pl-5">
            <div className="relative aspect-[1.05] overflow-hidden rounded-3xl bg-accent">
              <Image
                src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=85"
                alt="Elektrikár pri oprave rozvodnej skrine"
                fill
                priority
                className="object-cover"
                sizes="(min-width: 1280px) 480px, (min-width: 1024px) 42vw, (min-width: 640px) 512px, 90vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark/70 via-transparent to-transparent" />
              <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold shadow-card sm:left-6 sm:top-6">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" /> FixLook pre
                váš domov
              </div>
              <p className="absolute bottom-36 left-6 right-6 hidden text-2xl font-medium tracking-tight text-white min-[400px]:block sm:bottom-32">
                Malá porucha.
                <br />
                Veľká úľava.
              </p>
            </div>
            <div className="absolute bottom-0 left-3 right-3 rounded-2xl border bg-white p-5 shadow-float sm:left-0 sm:right-7 sm:p-6">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Ukážka priebehu objednávky
              </p>
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
                  <Wrench aria-hidden="true" className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Oprava v domácnosti</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Rozsah aj cena dohodnuté v chate
                  </p>
                </div>
                <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-primary-strong" />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {["Popis problému", "Ponuka majstra", "Vaše schválenie"].map((label) => (
                  <span
                    key={label}
                    className="flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1.5 text-[11px] font-medium text-slate-600"
                  >
                    <Check aria-hidden="true" className="h-3 w-3 text-primary-strong" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="sluzby" className="bg-accent px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary-strong">
                  Čo potrebujete vyriešiť?
                </p>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Pomoc, ktorá príde vhod.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-slate-600">
                Vyberte službu a povedzte nám, čo sa deje. O ďalšie kroky sa postaráme spolu.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {services.map((service) => (
                <Link
                  key={service.name}
                  href="/register"
                  className="group rounded-3xl border bg-white p-6 shadow-card transition-colors hover:border-slate-300 sm:p-8"
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={
                        "flex h-14 w-14 items-center justify-center rounded-2xl " + service.color
                      }
                    >
                      <service.icon aria-hidden="true" className="h-6 w-6" />
                    </span>
                    <span
                      aria-hidden="true"
                      className="flex h-11 w-11 items-center justify-center rounded-full border text-slate-500 transition-colors group-hover:border-dark group-hover:bg-dark group-hover:text-white"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mb-2 mt-7 text-xs font-medium text-muted-foreground">
                    {service.category}
                  </p>
                  <h3 className="text-2xl font-semibold tracking-tight">{service.name}</h3>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-600">
                    {service.description}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {service.examples.map((example) => (
                      <span
                        key={example}
                        className="rounded-full bg-accent px-3 py-1.5 text-xs text-slate-600"
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="ako-to-funguje" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary-strong">
            Od problému k oprave
          </p>
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Pár krokov. Všetko prehľadne.
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4 lg:gap-7">
            {steps.map((step, index) => (
              <div key={step.title} className="border-t pt-6">
                <span className="text-sm font-semibold text-primary-strong">0{index + 1}</span>
                <h3 className="mb-3 mt-5 text-lg font-semibold tracking-tight">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="preco-fixlook" className="px-5 sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 rounded-3xl bg-dark p-7 text-white sm:p-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:p-14">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Prečo FixLook
              </p>
              <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Menej neistoty.
                <br />
                Viac pokoja doma.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-300">
                Od prvej správy až po dokončenú opravu máte prehľad o tom, čo sa deje. Bez hľadania
                správ a dohôd na viacerých miestach.
              </p>
              <Button asChild className="mt-8" size="lg">
                <Link href="/register">
                  Vytvoriť účet <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="space-y-7">
              {[
                {
                  icon: WalletCards,
                  title: "Cena, ktorú máte pod kontrolou",
                  description:
                    "Odhad je začiatok. Konkrétnu ponuku aj každú prácu navyše potvrdzujete vy."
                },
                {
                  icon: MessageCircle,
                  title: "Priamy kontakt s majstrom",
                  description: "Termín a rozsah opravy si dohodnete v chate priamo pri objednávke."
                },
                {
                  icon: ShieldCheck,
                  title: "Podpora na jednom mieste",
                  description:
                    "S otázkou alebo podnetom sa môžete obrátiť na tím FixLook cez svoj účet."
                }
              ].map((benefit) => (
                <div key={benefit.title} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-primary">
                    <benefit.icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold">{benefit.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary-strong">
              Máte otázky?
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Je dobré vedieť.</h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
              Tu sú odpovede na veci, ktoré vás môžu zaujímať pred prvou objednávkou.
            </p>
          </div>
          <div className="divide-y border-y">
            {questions.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="flex min-h-6 cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold [&::-webkit-details-marker]:hidden sm:text-base">
                  {item.question}
                  <ChevronDown
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="pb-1 pt-4 text-sm leading-relaxed text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="border-y bg-primary-soft px-5 py-10 sm:px-8 sm:py-12">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Ste majster? Pridajte sa k nám.
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Spravujte zákazky, ponuky a komunikáciu na jednom mieste.
              </p>
            </div>
            <Button asChild variant="dark" size="lg">
              <Link href="/register?role=master">
                Vytvoriť účet majstra <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <BrandLogo />
            <p className="mt-2 text-xs text-muted-foreground">
              Pomoc pre váš domov. Prehľadne a s dohodnutou cenou.
            </p>
          </div>
          <nav
            aria-label="Pätička"
            className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600"
          >
            <Link href="#sluzby" className="hover:text-dark">
              Služby
            </Link>
            <Link href="#ako-to-funguje" className="hover:text-dark">
              Ako to funguje
            </Link>
            <Link href="/login" className="hover:text-dark">
              Môj účet
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
