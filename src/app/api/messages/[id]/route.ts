import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validators";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getCurrentProfile()) return NextResponse.json({ error: "Prihláste sa znova." }, { status: 401 });
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) return NextResponse.json({ error: "Neplatná konverzácia." }, { status: 400 });
  const db = await createServerSupabaseClient();
  const { data: conversation, error: accessError } = await db.from("conversations").select("id,status").eq("id", id).single();
  if (accessError || !conversation) return NextResponse.json({ error: "Konverzácia sa nenašla." }, { status: 404 });
  const url = new URL(request.url);
  const after = Number(url.searchParams.get("after") ?? 0);
  const before = Number(url.searchParams.get("before") ?? 0);
  if (![after, before].every(n => Number.isSafeInteger(n) && n >= 0)) return NextResponse.json({ error: "Neplatný rozsah správ." }, { status: 400 });
  let query = db.from("messages").select("*").eq("conversation_id", id).order("id", { ascending: after > 0 }).limit(50);
  if (after) query = query.gt("id", after);
  if (before) query = query.lt("id", before);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Správy sa nepodarilo načítať." }, { status: 503 });
  return NextResponse.json({ messages: after ? data : [...(data ?? [])].reverse(), status: conversation.status }, { headers: { "Cache-Control": "private, no-store" } });
}
