"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { sendMessageAction, markReadAction } from "@/actions/messages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils";
import type { Message } from "@/lib/database.types";

const roles = { customer: "Zákazník", master: "Majster", admin: "Podpora FixLook" };
export function Chat({ conversationId, userId, initialMessages, initialStatus }: { conversationId: string; userId: string; initialMessages: Message[]; initialStatus: string }) {
  const [messages, setMessages] = useState(initialMessages);
  const [status, setStatus] = useState(initialStatus);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(initialMessages.length === 50);
  const latest = useRef(initialMessages.at(-1)?.id ?? 0);
  const read = useRef(0);
  const clientId = useRef<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const refresh = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const response = await fetch(`/api/messages/${conversationId}?after=${latest.current}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const incoming: Message[] = result.messages;
      const nearBottom = !list.current || list.current.scrollHeight - list.current.scrollTop - list.current.clientHeight < 100;
      setMessages(current => [...new Map([...current, ...incoming].map(message => [message.id, message])).values()].sort((a, b) => a.id - b.id));
      latest.current = Math.max(latest.current, incoming.at(-1)?.id ?? 0);
      setStatus(result.status);
      setConnectionError("");
      if (latest.current > read.current) {
        const result = await markReadAction(conversationId, latest.current);
        if (result?.error) throw new Error(result.error);
        read.current = latest.current;
      }
      if (incoming.length && nearBottom) requestAnimationFrame(() => list.current?.scrollTo({ top: list.current.scrollHeight }));
    } catch { setConnectionError("Spojenie sa prerušilo. Správy zostali zachované; pripájame sa znova."); }
  }, [conversationId]);
  useEffect(() => { setStatus(initialStatus); }, [initialStatus]);
  useEffect(() => {
    void refresh();
    list.current?.scrollTo({ top: list.current.scrollHeight });
    const timer = setInterval(() => void refresh(), 5000);
    const onFocus = () => void refresh();
    document.addEventListener("visibilitychange", onFocus);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onFocus); };
  }, [refresh]);
  async function loadOlder() {
    setLoadingOlder(true);
    try {
      const response = await fetch(`/api/messages/${conversationId}?before=${messages[0]?.id ?? 0}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const result: { messages: Message[] } = await response.json();
      const oldHeight = list.current?.scrollHeight ?? 0;
      setMessages(current => [...new Map([...result.messages, ...current].map(message => [message.id, message])).values()].sort((a,b) => a.id-b.id));
      setHasOlder(result.messages.length === 50);
      requestAnimationFrame(() => { if (list.current) list.current.scrollTop = list.current.scrollHeight - oldHeight; });
    } catch { setError("Staršie správy sa nepodarilo načítať."); }
    setLoadingOlder(false);
  }
  return <div className="space-y-4">
    {connectionError && <p role="status" className="text-sm text-amber-800">{connectionError}</p>}
    <div ref={list} role="log" aria-label="Správy v konverzácii" aria-live="polite" className="h-[min(55vh,520px)] space-y-5 overflow-y-auto rounded-2xl border bg-accent p-4 sm:p-6">
      {hasOlder && <Button type="button" variant="outline" onClick={loadOlder} disabled={loadingOlder}>{loadingOlder ? "Načítavam…" : "Staršie správy"}</Button>}
      {!messages.length && <p className="text-sm text-muted-foreground">Zatiaľ tu nie sú žiadne správy. Dohodnite si podrobnosti zákazky.</p>}
      {messages.map(message => <div key={message.id} className={`flex ${message.sender_id === userId ? "justify-end" : "justify-start"}`}>
        <article className={`max-w-[90%] rounded-2xl px-4 py-3.5 sm:max-w-[75%] ${message.sender_id === userId ? "rounded-br-sm bg-primary-soft text-dark" : "rounded-bl-sm border bg-white shadow-card"}`}>
          <p className="text-xs font-semibold">{message.is_system ? "Udalosť objednávky · " : ""}{message.sender_id === userId ? "Vy" : message.sender_name} · {roles[message.sender_role]}</p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">{message.body}</p>
          <time dateTime={message.created_at} className="mt-2 block text-xs text-muted-foreground">{formatDateTime(message.created_at)}</time>
        </article>
      </div>)}
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {status === "closed" ? <p className="rounded-lg bg-slate-100 p-4 text-sm">Podnet je uzavretý. Ak potrebujete pokračovať, znovu ho otvorte.</p> :
      <form onSubmit={async event => {
        event.preventDefault(); if (sending || !body.trim()) return;
        setSending(true); setError("");
        clientId.current ??= crypto.randomUUID();
        try {
          const result = await sendMessageAction(conversationId, body, clientId.current);
          if (result.error) setError(result.error);
          else { setBody(""); clientId.current = null; await refresh(); list.current?.scrollTo({ top: list.current.scrollHeight }); }
        } catch { setError("Správu sa nepodarilo odoslať. Text zostal zachovaný; skúste to znova."); }
        finally { setSending(false); }
      }} className="space-y-2">
        <label htmlFor="message-body" className="text-sm font-medium">Vaša správa</label>
        <Textarea id="message-body" value={body} onChange={event => { setBody(event.target.value); clientId.current = null; }} maxLength={4000} rows={3} required disabled={sending} placeholder="Napíšte správu…" />
        <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{body.length}/4 000</span><Button type="submit" disabled={sending || !body.trim()}>{sending ? "Odosielam…" : "Odoslať správu"}</Button></div>
      </form>}
  </div>;
}
