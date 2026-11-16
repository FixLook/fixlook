"use client";
import { useMemo, useState } from "react";
import { proposeQuoteAction } from "@/actions/quotes";
import { formatCurrency } from "@/lib/utils";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function cents(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(normalized)) return null;
  const [euros, fraction = ""] = normalized.split(".");
  const value = Number(euros) * 100 + Number(fraction.padEnd(2, "0"));
  return value <= 10000000 ? value : null;
}

export function QuoteForm({ orderId, extra }: { orderId: string; extra: boolean }) {
  const [amounts, setAmounts] = useState({ labor: "", materials: "0", travel: "0" });
  const values = useMemo(() => [amounts.labor, amounts.materials, amounts.travel].map(cents), [amounts]);
  const valid = values.every((value): value is number => value !== null);
  const labor = values[0] ?? 0;
  const total = valid ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null;
  const commission = Math.round(labor * 0.15);
  return <form action={proposeQuoteAction} className="space-y-4 rounded-xl bg-accent p-4 sm:p-5">
    <h3 className="font-semibold">{extra ? "Navrhnúť práce navyše" : "Pripraviť cenovú ponuku"}</h3>
    <input type="hidden" name="orderId" value={orderId} />
    <div className="space-y-2">
      <Label htmlFor="quote-scope">Presný rozsah prác, materiál a podmienky</Label>
      <Textarea id="quote-scope" name="scope" minLength={10} maxLength={4000} required placeholder="Napríklad: diagnostika 20 min, výmena 30 min, zásuvka a kryt, doprava… Uveďte, čo nie je v cene."/>
      <p className="text-xs text-muted-foreground">Odporúčame rozpísať úkony, odhadované trvanie a materiál, aby zákazník vedel cenu posúdiť.</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-3">
      {([["labor","Práca (€)"],["materials","Materiál (€)"],["travel","Doprava (€)"]] as const).map(([name,label]) =>
        <div key={name} className="space-y-2">
          <Label htmlFor={`quote-${name}`}>{label}</Label>
          <Input id={`quote-${name}`} name={name} type="text" inputMode="decimal" value={amounts[name]} onChange={e => setAmounts(current => ({...current,[name]:e.target.value}))} required />
        </div>)}
    </div>
    <div className="space-y-2 rounded-lg border bg-white p-4" aria-live="polite">
      <div className="flex justify-between gap-2 text-sm"><span>Cena pre zákazníka</span><strong>{total === null ? "Skontrolujte sumy" : formatCurrency(total)}</strong></div>
      {valid && <>
        <div className="flex justify-between gap-2 text-sm"><span>Provízia FixLook (15 % iba z práce)</span><span>{formatCurrency(commission)}</span></div>
        <div className="flex justify-between gap-2 text-sm"><span>Podiel majstra pred vlastnými nákladmi</span><strong>{formatCurrency((total ?? 0) - commission)}</strong></div>
      </>}
    </div>
    <p className="text-xs text-muted-foreground">Uveďte konečné sumy vrátane daní a poplatkov. Materiál ani doprava nepodliehajú provízii. Ponuka platí až po výslovnom schválení zákazníkom. Predchádzajúca neschválená ponuka zostane v histórii.</p>
    <SubmitButton pendingText="Odosielam ponuku…" disabled={!valid}>Poslať zákazníkovi na schválenie</SubmitButton>
  </form>;
}
