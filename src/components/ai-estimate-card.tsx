import { Sparkles } from "lucide-react";
import { AI_ESTIMATE_DISCLAIMER, type AiEstimateResult } from "@/lib/ai-estimate";
import { formatEstimate } from "@/lib/utils";

export function AiEstimateCard({ result, photoCount }: { result: AiEstimateResult; photoCount: number }) {
  return <section aria-label="Nezáväzný AI odhad ceny" className="rounded-2xl border border-primary/30 bg-accent p-5 sm:p-6">
    <div className="flex items-center gap-2 text-sm font-semibold text-sky-900"><Sparkles className="h-4 w-4" aria-hidden="true" /> Nezáväzný AI odhad</div>
    {result.kind === "range" ? <>
      <p className="mt-3 text-3xl font-bold tracking-tight text-dark">{formatEstimate(result.total.min, result.total.max)}</p>
      <p className="mt-1 text-sm text-sky-900">Celkom vrátane práce, materiálu, výjazdu a prípadných daní</p>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">{[{ name: "Práca", amount: result.labor }, { name: "Materiál", amount: result.materials }, { name: "Výjazd", amount: result.travel }].map(({ name, amount }) =>
        <div key={name} className="rounded-xl bg-white/80 p-3"><dt className="text-muted-foreground">{name}</dt><dd className="mt-1 font-semibold">{formatEstimate(amount.min, amount.max)}</dd></div>
      )}</dl>
    </> : <p className="mt-3 text-xl font-bold text-dark">Na odhad ceny je potrebná obhliadka</p>}
    <p className="mt-4 whitespace-pre-wrap break-words text-sm">{result.summary}</p>
    <div className="mt-4 space-y-4"><EstimateList title="Čo odhad predpokladá" items={result.assumptions} /><EstimateList title="Čo môže cenu zmeniť" items={result.priceFactors} /><EstimateList title="Čo ešte upresniť majstrovi" items={result.questions} /></div>
    <p className="mt-5 text-xs text-muted-foreground">{photoCount ? `Odhad podľa opisu a fotografií. Počet fotografií: ${photoCount}.` : "Odhad iba podľa opisu, bez fotografií."} Skryté poškodenia nemusia byť na fotografiách viditeľné.</p>
    <p className="mt-3 rounded-xl border border-sky-200 bg-white/80 p-3 text-sm text-sky-950">{AI_ESTIMATE_DISCLAIMER}</p>
  </section>;
}

function EstimateList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <div><h3 className="text-sm font-semibold">{title}</h3><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{items.map((item, index) => <li key={index} className="break-words">{item}</li>)}</ul></div>;
}
