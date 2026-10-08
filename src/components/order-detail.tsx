import { AutoRefresh } from "@/components/auto-refresh";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { acceptOrderAction, rejectOrderAction, completeOrderAction } from "@/actions/master";
import { proposeQuoteAction, respondToQuoteAction, cancelOrderAction, withdrawQuoteAction } from "@/actions/quotes";
import { createCheckoutSessionAction } from "@/actions/payments";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateTime, formatEstimate } from "@/lib/utils";
import { uuidSchema } from "@/lib/validators";
import type { UserRole } from "@/lib/database.types";
import { Notice } from "@/components/notice";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export async function OrderDetail({ role, params, searchParams }: { role: UserRole; params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; message?: string }> }) {
  const profile = await requireProfile(role);
  const { id } = await params;
  await searchParams;
  if (!uuidSchema.safeParse(id).success) notFound();
  const db = await createServerSupabaseClient();
  const { data: order } = await db.from("orders").select("*").eq("id", id).single();
  if (!order || (role === "customer" && order.customer_id !== profile.id) || (role === "master" && order.master_id !== profile.id)) notFound();
  const [serviceResult, peopleResult, quotesResult, paymentsResult, photosResult, conversationResult] = await Promise.all([
    db.from("services").select("name").eq("id", order.service_id).single(),
    db.from("profiles").select("id,full_name,phone").in("id", [order.customer_id, ...(order.master_id ? [order.master_id] : [])]),
    db.from("order_quotes").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    db.from("payments").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    db.from("order_photos").select("*").eq("order_id", id),
    db.from("conversations").select("id").eq("order_id", id).eq("kind", "order").maybeSingle()
  ]);
  const quotes = quotesResult.data ?? [];
  const payments = paymentsResult.data ?? [];
  const paid = payments.filter(p => p.status !== "pending").reduce((sum, p) => sum + p.amount, 0);
  const refunded = payments.reduce((sum, p) => sum + p.refunded_amount, 0);
  const photos = await Promise.all((photosResult.data ?? []).map(async photo => {
    const { data } = await db.storage.from("order-photos").createSignedUrl(photo.photo_url, 900);
    return { id: photo.id, url: data?.signedUrl };
  }));
  const blocked = quotes.some(q => q.status === "proposed") || payments.some(p => p.status === "pending");
  const canPropose = role !== "customer" && ["accepted", "in_progress"].includes(order.status) && !payments.some(p => p.status === "pending");
  const hasError = [quotesResult, paymentsResult, peopleResult, photosResult, conversationResult].some(result => result.error);
  return <div className="space-y-6"><AutoRefresh />
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">{order.order_number}</h1><p className="mt-1 text-muted-foreground">{serviceResult.data?.name ?? "Služba"}</p></div><StatusBadge status={order.status} /></div>
    <Notice error={hasError ? "Niektoré údaje sa nepodarilo načítať. Obnovte stránku pred vykonaním zmien." : undefined} />
    <div className="flex flex-wrap gap-3">
      {conversationResult.data && <Button asChild><Link href={`/${role}/messages/${conversationResult.data.id}`}>Otvoriť chat k objednávke</Link></Button>}
      <Button asChild variant="outline"><Link href={`/${role}/messages?order=${id}#podpora`}>Kontaktovať podporu</Link></Button>
      {role === "customer" && order.status === "completed" && <Button asChild variant="outline"><Link href="/customer/ratings">Ohodnotiť prácu</Link></Button>}
    </div>
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card><CardHeader><CardTitle>Podrobnosti objednávky</CardTitle></CardHeader><CardContent className="space-y-4">
        <Detail label="Popis problému" value={order.problem_description} /><Detail label="Adresa" value={`${order.address}, ${order.city}`} />
        <Detail label="Preferovaný termín (slovenský čas)" value={formatDateTime(order.preferred_datetime)} />
        <Detail label="Orientačný odhad" value={formatEstimate(order.estimated_price, order.estimated_price_max)} />
        <p className="text-sm text-muted-foreground">Odhad nie je záväzná cena. Presnú cenu a rozsah potvrdíte v cenovej ponuke. Termín si dohodnite s majstrom v chate.</p>
        {(peopleResult.data ?? []).filter(person => person.id !== profile.id).map(person => <div key={person.id}><Detail label={person.id === order.customer_id ? "Zákazník" : "Majster"} value={person.full_name} /><p className="mt-1 text-sm">{person.phone ?? "Telefón nie je uvedený"}</p></div>)}
        {!order.master_id && <p className="text-sm text-muted-foreground">Administrátor vám pridelí overeného majstra.</p>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Cena a platby</CardTitle></CardHeader><CardContent className="space-y-4">
        <Detail label="Spolu schválené" value={formatCurrency(order.final_price)} /><Detail label="Uhradené" value={formatCurrency(paid)} />
        {refunded > 0 && <Detail label="Vrátené zákazníkovi" value={formatCurrency(refunded)} />}
        {payments.filter(payment => payment.status === "pending" && payment.quote_id).map(payment => <div key={payment.id} className="rounded-lg border bg-accent p-3">
          <p className="text-sm">Na úhradu: <strong>{formatCurrency(payment.amount)}</strong></p>
          {role === "customer" ? <form action={createCheckoutSessionAction} className="mt-3"><input type="hidden" name="paymentId" value={payment.id} /><SubmitButton pendingText="Otváram platbu…">Zaplatiť schválenú ponuku</SubmitButton></form> : <p className="mt-2 text-sm text-muted-foreground">Čaká sa na platbu zákazníka.</p>}
        </div>)}
        {payments.some(payment => !payment.quote_id && payment.status === "pending") && <p className="text-sm text-amber-800">Táto objednávka má platbu zo staršej verzie. Pred pokračovaním ju musí skontrolovať podpora.</p>}
        {role === "master" && order.status === "assigned" && <div className="flex flex-wrap gap-2"><form action={acceptOrderAction}><input type="hidden" name="orderId" value={id} /><SubmitButton>Prijať zákazku</SubmitButton></form><form action={rejectOrderAction}><input type="hidden" name="orderId" value={id} /><SubmitButton variant="outline">Odmietnuť</SubmitButton></form></div>}
        {role === "master" && order.status === "in_progress" && <form action={completeOrderAction} className="space-y-2"><input type="hidden" name="orderId" value={id} /><SubmitButton disabled={blocked || hasError}>Označiť prácu ako dokončenú</SubmitButton>{blocked && <p className="text-sm text-muted-foreground">Najprv vyriešte otvorené ponuky a ich úhrady.</p>}</form>}
        {role === "customer" && ["new", "assigned", "accepted"].includes(order.status) && !payments.length && !hasError && <form action={cancelOrderAction} className="space-y-2"><input type="hidden" name="orderId" value={id} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" required /> Chcem zrušiť túto objednávku</label><SubmitButton variant="outline">Zrušiť objednávku</SubmitButton></form>}
      </CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Cenové ponuky a práce navyše</CardTitle></CardHeader><CardContent className="space-y-5">
      <p className="text-sm text-muted-foreground">Každá ponuka uvádza celkovú cenu vrátane všetkých nákladov. Práce navyše sa realizujú až po samostatnom schválení a úhrade. Schválenú cenu nemožno jednostranne zmeniť.</p>
      {!quotes.length && <p className="rounded-lg bg-accent p-4 text-sm">{order.status === "new" || order.status === "assigned" ? "Po prijatí zákazky majster posúdi problém a pripraví ponuku." : "Zatiaľ nebola vytvorená cenová ponuka. Podrobnosti môžete dohodnúť v chate."}</p>}
      {quotes.map(quote => <article key={quote.id} className="rounded-xl border p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{quote.kind === "initial" ? "Základná ponuka" : "Práce navyše"} · {formatCurrency(quote.total_amount)}</h3><StatusBadge status={quote.status === "accepted" ? "quote_accepted" : quote.status} /></div>
        <p className="mt-1 text-xs text-muted-foreground">Vytvorené {formatDateTime(quote.created_at)}</p><p className="mt-4 whitespace-pre-wrap break-words text-sm">{quote.scope}</p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><div><dt className="text-muted-foreground">Práca</dt><dd>{formatCurrency(quote.labor_amount)}</dd></div><div><dt className="text-muted-foreground">Materiál</dt><dd>{formatCurrency(quote.materials_amount)}</dd></div><div><dt className="text-muted-foreground">Doprava</dt><dd>{formatCurrency(quote.travel_amount)}</dd></div></dl>
        {quote.responded_at && <p className="mt-3 text-xs text-muted-foreground">{quote.status === "accepted" ? "Schválené zákazníkom" : "Odpoveď zákazníka"}: {formatDateTime(quote.responded_at)}</p>}
        {quote.response_note && <p className="mt-2 whitespace-pre-wrap break-words text-sm">Poznámka zákazníka: {quote.response_note}</p>}
        {role === "customer" && quote.status === "proposed" && !hasError && <form action={respondToQuoteAction} className="mt-5 space-y-3">
          <input type="hidden" name="quoteId" value={quote.id} /><Label htmlFor={`note-${quote.id}`}>Poznámka alebo dôvod odmietnutia (nepovinné)</Label><Textarea id={`note-${quote.id}`} name="note" maxLength={1000} />
          <p className="text-sm">Schválením súhlasíte s uvedeným rozsahom a cenou {formatCurrency(quote.total_amount)}{quote.kind === "extra" ? " navyše k pôvodnej zákazke" : ""}. Následne môžete zaplatiť online.</p>
          <div className="flex flex-wrap gap-2"><SubmitButton name="decision" value="accept">Schváliť cenu {formatCurrency(quote.total_amount)}</SubmitButton><SubmitButton name="decision" value="reject" variant="outline">Odmietnuť a požiadať o úpravu</SubmitButton></div>
        </form>}
        {role !== "customer" && quote.status === "proposed" && <form action={withdrawQuoteAction} className="mt-4"><input type="hidden" name="quoteId" value={quote.id} /><SubmitButton variant="outline" size="sm">Stiahnuť túto ponuku</SubmitButton></form>}
      </article>)}
      {canPropose && !hasError && <form action={proposeQuoteAction} className="space-y-4 rounded-xl bg-accent p-4 sm:p-5">
        <h3 className="font-semibold">{order.status === "in_progress" ? "Navrhnúť práce navyše" : "Pripraviť cenovú ponuku"}</h3><input type="hidden" name="orderId" value={id} />
        <div className="space-y-2"><Label htmlFor="quote-scope">Presný rozsah prác, materiál a podmienky</Label><Textarea id="quote-scope" name="scope" minLength={10} maxLength={4000} required placeholder="Čo cena zahŕňa, čo treba opraviť a aké práce vykonáte…" /></div>
        <div className="grid gap-4 sm:grid-cols-3">{[["labor", "Práca (€)"], ["materials", "Materiál (€)"], ["travel", "Doprava (€)"]].map(([name,label]) => <div key={name} className="space-y-2"><Label htmlFor={`quote-${name}`}>{label}</Label><Input id={`quote-${name}`} name={name} type="text" inputMode="decimal" defaultValue={name === "labor" ? "" : "0"} required /></div>)}</div>
        <p className="text-xs text-muted-foreground">Uveďte konečné sumy vrátane daní a poplatkov. Aktívnu neschválenú ponuku nahradí táto nová ponuka; história zostane zachovaná.</p>
        <SubmitButton pendingText="Odosielam ponuku…">Poslať zákazníkovi na schválenie</SubmitButton>
      </form>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Fotografie problému</CardTitle></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{photos.map(photo => <div key={photo.id} className="relative aspect-square overflow-hidden rounded-lg border">{photo.url ? <Image src={photo.url} alt="Fotografia problému v objednávke" fill unoptimized className="object-cover" sizes="(min-width: 1024px) 25vw, 50vw" /> : <p className="p-4 text-sm">Fotografiu sa nepodarilo načítať.</p>}</div>)}</div>{!photos.length && <p className="text-sm text-muted-foreground">Nie sú priložené žiadne fotografie.</p>}</CardContent></Card>
  </div>;
}
function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{value}</p></div>; }
