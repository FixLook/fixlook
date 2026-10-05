import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!await getCurrentProfile()) return NextResponse.json({ error: "Prihláste sa." }, { status: 401 });
  const db = await createServerSupabaseClient();
  const { data, error } = await db.rpc("unread_message_count");
  if (error) return NextResponse.json({ error: "Správy sa nepodarilo načítať." }, { status: 503 });
  return NextResponse.json({ count: Number(data ?? 0) }, { headers: { "Cache-Control": "private, no-store" } });
}
