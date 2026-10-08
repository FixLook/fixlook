"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createOrderAction } from "@/actions/orders";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { formatEstimate } from "@/lib/utils";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/lib/database.types";
import { Sparkles } from "lucide-react";
import { AiEstimateCard } from "@/components/ai-estimate-card";
import { estimateInputSchema, aiEstimateResultSchema, type EstimateResponse } from "@/lib/ai-estimate";
import { prepareEstimatePhotos, validateOrderPhotos } from "@/lib/estimate-photos";
export function OrderForm({ services, profileId, city, aiEnabled = false }: { services: Database["public"]["Tables"]["services"]["Row"][]; profileId: string; city: string; aiEnabled?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState("");
  const requestId = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputVersion = useRef(0);
  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState("");
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  async function calculateEstimate() {
    if (!formRef.current || aiPending || pending) return;
    const version = inputVersion.current;
    const form = new FormData(formRef.current);
    const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    const input = estimateInputSchema.safeParse({ serviceId: Number(form.get("serviceId")), problemDescription: form.get("problemDescription"), city: form.get("city"), images: [] });
    if (!input.success) { setAiError(input.error.errors[0]?.message ?? "Vyplňte službu, opis a mesto."); return; }
    setAiPending(true); setAiError("");
    try {
      const images = await prepareEstimatePhotos(files);
      if (version !== inputVersion.current) { setAiError("Údaje sa zmenili. Pre aktuálny problém vypočítajte nový odhad."); return; }
      const response = await fetch("/api/estimates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input.data, images }), signal: AbortSignal.timeout(55_000) });
      const data = await response.json();
      if (version !== inputVersion.current) { setAiError("Údaje sa zmenili. Pre aktuálny problém vypočítajte nový odhad."); return; }
      if (!response.ok) { setAiError(data.error ?? "Odhad sa nepodaril. Objednávku môžete odoslať aj bez neho."); return; }
      const result = aiEstimateResultSchema.parse(data.result);
      setEstimate({ ...data, result });
    } catch (error) {
      setAiError(error instanceof Error && error.message.startsWith("Fotograf") ? error.message : "AI odhad sa teraz nepodaril. Objednávku môžete odoslať aj bez neho.");
    } finally { setAiPending(false); }
  }
  return <form ref={formRef} className="space-y-5" onChange={event => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
    const name = target.name;
    if (["serviceId", "problemDescription", "city", "photos"].includes(name)) { inputVersion.current++; setEstimate(null); setAiError(""); }
  }} onSubmit={async event => {
    event.preventDefault(); if (pending || aiPending) return;
    const form = new FormData(event.currentTarget);
    const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    const types: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    try { validateOrderPhotos(files); } catch (error) { setError((error as Error).message); return; }
    // Files go directly to private Storage, never through a Vercel function body.
    form.delete("photos");
    requestId.current ??= crypto.randomUUID(); form.set("requestId", requestId.current);
    setPending(true); setError(""); setProgress("Vytváram objednávku…");
    let orderId: string | undefined;
    let failed = 0;
    try {
      const result = await createOrderAction(form);
      if (result.error || !result.orderId) { setError(result.error ?? "Objednávka sa nepodarila vytvoriť."); setPending(false); return; }
      orderId = result.orderId;
      const db = createClientSupabaseClient();
      for (const [index, file] of files.entries()) {
        setProgress(`Nahrávam fotografiu ${index + 1} z ${files.length}…`);
        const path = `${profileId}/${orderId}/${crypto.randomUUID()}.${types[file.type]}`;
        const { error: upload } = await db.storage.from("order-photos").upload(path, file, { contentType: file.type, upsert: false });
        if (upload) { failed++; continue; }
        const { error: save } = await db.rpc("attach_order_photo", { p_order: orderId, p_path: path });
        if (save) failed++;
      }
    } catch {
      if (!orderId) { setError("Odoslanie sa prerušilo. Skúste to znova; rovnakú objednávku nevytvoríme dvakrát."); setPending(false); return; }
      failed++;
    }
    const suffix = failed ? "?error=" + encodeURIComponent("Objednávka bola vytvorená, ale niektoré fotografie sa nepodarilo nahrať. Kontaktujte podporu.") : "";
    router.push(`/customer/orders/${orderId}${suffix}`); router.refresh();
  }}>
    <Notice error={error} />
    {estimate && <input type="hidden" name="aiEstimateId" value={estimate.estimateId} />}
    <fieldset disabled={pending} className="space-y-5">
      <div className="space-y-2"><Label htmlFor="serviceId">Služba</Label><Select id="serviceId" name="serviceId" required>{services.map(service => <option key={service.id} value={service.id}>{service.name}{!aiEnabled ? ` – ${formatEstimate(service.base_price, service.estimate_max)}` : ""}</option>)}</Select><p className="text-xs text-muted-foreground">Cena závisí od rozsahu opravy a materiálu. Záväznú cenu schválite v ponuke.</p></div>
      <div className="space-y-2"><Label htmlFor="problemDescription">Popis problému</Label><Textarea id="problemDescription" name="problemDescription" minLength={10} maxLength={4000} placeholder="Napríklad: Pod kuchynským drezom uniká voda do skrinky." required /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="address">Adresa</Label><Input id="address" name="address" minLength={5} maxLength={300} autoComplete="street-address" required /></div><div className="space-y-2"><Label htmlFor="city">Mesto</Label><Input id="city" name="city" defaultValue={city} minLength={2} maxLength={100} autoComplete="address-level2" required /></div></div>
      <div className="space-y-2"><Label htmlFor="preferredDatetime">Preferovaný termín (slovenský čas)</Label><Input id="preferredDatetime" name="preferredDatetime" type="datetime-local" /></div>
      <div className="space-y-2"><Label htmlFor="photos">Fotografie</Label><Input id="photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple /><p className="text-xs text-muted-foreground">Najviac 5 fotografií, každá do 5 MB. Fotografie vidíte vy, pridelený majster a administrátor.</p></div>
      {aiEnabled && <section aria-labelledby="ai-estimate-heading" className="space-y-4 rounded-2xl border p-4 sm:p-5">
        <div><h2 id="ai-estimate-heading" className="font-semibold">Koľko môže oprava stáť?</h2><p className="mt-1 text-sm text-muted-foreground">AI vám pripraví nezáväzné rozpätie vrátane práce, materiálu a výjazdu. Fotografie pomôžu spresniť odhad; niekedy bude potrebná obhliadka.</p></div>
        <p className="text-xs text-muted-foreground">Po kliknutí odošleme opis, mesto a zmenšené fotografie AI službe cez Vercel AI Gateway. Adresu a kontaktné polia neposielame. Do opisu ani fotografií nevkladajte osobné doklady alebo zbytočné osobné údaje.</p>
        <Button type="button" variant="outline" disabled={pending || aiPending || !!estimate || !services.length} onClick={calculateEstimate}><Sparkles className="h-4 w-4" aria-hidden="true" />{aiPending ? "Posudzujem problém a fotografie…" : estimate ? "AI odhad je pripravený" : "Získať nezáväzný AI odhad"}</Button>
        {aiPending && <p role="status" className="text-sm text-muted-foreground">Výpočet môže trvať niekoľko desiatok sekúnd.</p>}
        <Notice error={aiError} />
        {estimate && <><AiEstimateCard result={estimate.result} photoCount={estimate.photoCount} /><Button type="button" variant="ghost" onClick={() => setEstimate(null)}>Pokračovať bez AI odhadu</Button></>}
      </section>}
    </fieldset>
    {!services.length && <p className="text-sm text-muted-foreground">Momentálne nie sú dostupné služby. Kontaktujte podporu.</p>}
    <Button type="submit" disabled={pending || aiPending || !services.length}>{pending ? progress : "Odoslať požiadavku"}</Button>
    {pending && <p role="status" className="text-sm text-muted-foreground">Počkajte, kým sa nahrávanie dokončí.</p>}
  </form>;
}
