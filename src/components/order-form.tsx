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
export function OrderForm({ services, profileId, city }: { services: Database["public"]["Tables"]["services"]["Row"][]; profileId: string; city: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState("");
  const requestId = useRef<string | null>(null);
  return <form className="space-y-5" onSubmit={async event => {
    event.preventDefault(); if (pending) return;
    const form = new FormData(event.currentTarget);
    const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    const types: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    if (files.length > 5 || files.some(file => !types[file.type] || file.size > 5 * 1024 * 1024)) { setError("Pridajte najviac 5 fotografií JPG, PNG alebo WebP, každú do 5 MB."); return; }
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
    <fieldset disabled={pending} className="space-y-5">
      <div className="space-y-2"><Label htmlFor="serviceId">Služba</Label><Select id="serviceId" name="serviceId" required>{services.map(service => <option key={service.id} value={service.id}>{service.name} – {formatEstimate(service.base_price, service.estimate_max)}</option>)}</Select></div>
      <div className="space-y-2"><Label htmlFor="problemDescription">Popis problému</Label><Textarea id="problemDescription" name="problemDescription" minLength={10} maxLength={4000} placeholder="Napríklad: Pod kuchynským drezom uniká voda do skrinky." required /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="address">Adresa</Label><Input id="address" name="address" minLength={5} maxLength={300} autoComplete="street-address" required /></div><div className="space-y-2"><Label htmlFor="city">Mesto</Label><Input id="city" name="city" defaultValue={city} minLength={2} maxLength={100} autoComplete="address-level2" required /></div></div>
      <div className="space-y-2"><Label htmlFor="preferredDatetime">Preferovaný termín (slovenský čas)</Label><Input id="preferredDatetime" name="preferredDatetime" type="datetime-local" /></div>
      <div className="space-y-2"><Label htmlFor="photos">Fotografie</Label><Input id="photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple /><p className="text-xs text-muted-foreground">Najviac 5 fotografií, každá do 5 MB. Fotografie vidíte vy, pridelený majster a administrátor.</p></div>
    </fieldset>
    {!services.length && <p className="text-sm text-muted-foreground">Momentálne nie sú dostupné služby. Kontaktujte podporu.</p>}
    <Button type="submit" disabled={pending || !services.length}>{pending ? progress : "Odoslať požiadavku"}</Button>
    {pending && <p role="status" className="text-sm text-muted-foreground">Počkajte, kým sa nahrávanie dokončí.</p>}
  </form>;
}
