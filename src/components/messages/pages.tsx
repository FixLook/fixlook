import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupportAction, setSupportStatusAction } from "@/actions/messages";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { uuidSchema } from "@/lib/validators";
import { publicError } from "@/lib/errors";
import type { UserRole } from "@/lib/database.types";
import { Chat } from "./chat";
import { AutoRefresh } from "@/components/auto-refresh";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Params = Promise<{ error?: string; message?: string; order?: string; page?: string }>;
export async function MessageInbox({ role, searchParams }: { role: UserRole; searchParams: Params }) {
  await requireProfile(role);
  const params = await searchParams;
  const page = Math.max(1, Math.min(10000, Math.floor(Number(params.page) || 1)));
  const db = await createServerSupabaseClient();
  const { data: conversations, error, count } = await db.rpc("message_inbox", {}, { count: "exact" }).range((page - 1) * 30, page * 30 - 1);
  const orderId = uuidSchema.safeParse(params.order);
  return <div className="space-y-6">
    <AutoRefresh />
    <div><h1 className="text-3xl font-bold">Správy a podpora</h1><p className="mt-2 text-muted-foreground">Konverzácie k objednávkam a súkromné podnety pre tím FixLook.</p></div>
    <Notice error={error ? publicError(error) : undefined} />
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Card><CardHeader><CardTitle>Konverzácie</CardTitle></CardHeader><CardContent className="space-y-3">
        {!conversations?.length && !error && <p className="text-sm text-muted-foreground">Zatiaľ nemáte žiadne konverzácie. Chat so zákazníkom alebo majstrom vznikne pri pridelení objednávky.</p>}
        {(conversations ?? []).map(item => <Link key={item.id} href={`/${role}/messages/${item.id}`} className="block rounded-lg border p-4 transition hover:bg-accent">
          <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">{item.kind === "support" ? "Podpora" : "Objednávka"} · {item.status === "open" ? "Otvorené" : "Uzavreté"}</span>{item.unread_count > 0 && <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs text-white">{item.unread_count} neprečítaných</span>}</div>
          <p className="mt-1 font-semibold break-words">{item.subject}</p><p className="mt-1 truncate text-sm text-muted-foreground">{item.last_body ?? "Začnite konverzáciu"}</p><p className="mt-2 text-xs text-muted-foreground">{formatDateTime(item.updated_at)}</p>
        </Link>)}
        <div className="flex justify-between text-sm">{page > 1 ? <Link href={`?page=${page - 1}`}>← Novšie</Link> : <span />}{(count ?? 0) > page * 30 && <Link href={`?page=${page + 1}`}>Staršie →</Link>}</div>
      </CardContent></Card>
      <Card id="podpora"><CardHeader><CardTitle>Napísať podpore</CardTitle></CardHeader><CardContent>
        <p className="mb-4 text-sm text-muted-foreground">Podnet vidíte iba vy a administrátor. Môžete riešiť cenu, platbu, reklamáciu alebo poslať návrh na zlepšenie.</p>
        <form action={createSupportAction} className="space-y-4">
          <input type="hidden" name="clientId" value={crypto.randomUUID()} />
          <input type="hidden" name="orderId" value={orderId.success ? orderId.data : ""} />
          {orderId.success && <p className="text-sm">Podnet bude pripojený k vybranej objednávke.</p>}
          <div><Label htmlFor="support-subject">Predmet</Label><Input id="support-subject" name="subject" minLength={3} maxLength={160} required /></div>
          <div><Label htmlFor="support-body">Čo potrebujete vyriešiť?</Label><Textarea id="support-body" name="body" maxLength={4000} rows={5} required /></div>
          <SubmitButton pendingText="Odosielam…">Odoslať podnet</SubmitButton>
        </form>
      </CardContent></Card>
    </div>
  </div>;
}
export async function MessageThread({ role, params, searchParams }: { role: UserRole; params: Promise<{ id: string }>; searchParams: Params }) {
  const profile = await requireProfile(role);
  const { id } = await params;
  await searchParams;
  if (!uuidSchema.safeParse(id).success) notFound();
  const db = await createServerSupabaseClient();
  const { data: conversation } = await db.from("conversations").select("*").eq("id", id).single();
  if (!conversation) notFound();
  const { data: messages, error } = await db.from("messages").select("*").eq("conversation_id", id).order("id", { ascending: false }).limit(50);
  return <div className="mx-auto max-w-4xl space-y-4">
    <Link href={`/${role}/messages`} className="text-sm text-emerald-800">← Všetky správy</Link>
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold break-words">{conversation.subject}</h1><p className="mt-1 text-sm text-muted-foreground">{conversation.kind === "support" ? "Súkromná konverzácia s podporou" : "Chat zákazníka a prideleného majstra. Administrátor má prístup pri riešení zákazky."}</p></div>
      {conversation.kind === "support" && <form action={setSupportStatusAction}><input type="hidden" name="conversationId" value={id} /><input type="hidden" name="closed" value={String(conversation.status !== "closed")} /><SubmitButton variant="outline">{conversation.status === "closed" ? "Znovu otvoriť" : "Označiť ako vyriešené"}</SubmitButton></form>}
    </div>
    {conversation.order_id && <Button asChild variant="outline"><Link href={`/${role}/orders/${conversation.order_id}`}>Detail objednávky</Link></Button>}
    <Notice error={error ? publicError(error) : undefined} />
    <Card><CardContent className="p-4 sm:p-6"><Chat key={id} conversationId={id} userId={profile.id} initialMessages={[...(messages ?? [])].reverse()} initialStatus={conversation.status} /></CardContent></Card>
  </div>;
}
