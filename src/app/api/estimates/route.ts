import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { estimateInputSchema, aiEstimateResultSchema, readEstimateBody, type EstimateResponse } from "@/lib/ai-estimate";
import { decodeEstimateImage, estimateFingerprint, generatePriceEstimate, isAiEstimateEnabled } from "@/lib/ai-estimate-server";
import { publicError } from "@/lib/errors";
import type { Json } from "@/lib/database.types";

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
const failure = (error: string, status: number) => NextResponse.json({ error }, { status, headers });

export async function POST(request: Request) {
  // Cookie-authenticated paid computation must be explicitly requested on our site.
  if (request.headers.get("origin") !== new URL(request.url).origin) return failure("Požiadavka musí pochádzať zo stránky FixLook.", 403);
  const profile = await getCurrentProfile();
  if (!profile) return failure("Pre AI odhad sa prihláste.", 401);
  if (profile.role !== "customer") return failure("AI odhad je dostupný zákazníkom pri objednávke.", 403);
  if (!isAiEstimateEnabled()) return failure("AI odhad momentálne nie je dostupný. Objednávku môžete odoslať aj bez neho.", 503);
  let input;
  try {
    input = estimateInputSchema.parse(await readEstimateBody(request));
    input.images.forEach(decodeEstimateImage);
  } catch { return failure("Skontrolujte opis, mesto a fotografie pre odhad.", 400); }
  const db = await createServerSupabaseClient();
  const { data: service, error: serviceError } = await db.from("services").select("name,description,base_price,estimate_max").eq("id", input.serviceId).eq("active", true).single();
  if (serviceError || !service) return failure("Vybraná služba nie je dostupná.", 400);
  const { data, error } = await db.rpc("reserve_ai_estimate", {
    p_service: input.serviceId, p_description: input.problemDescription, p_city: input.city,
    p_fingerprint: estimateFingerprint(input, service), p_photo_count: input.images.length
  });
  if (error || !data) return failure(publicError(error), error?.code === "P0001" ? 429 : 503);
  const attempt = Array.isArray(data) ? data[0] : data;
  if (!attempt) return failure("Odhad sa nepodarilo pripraviť. Skúste to neskôr.", 503);
  if (attempt.status === "completed") {
    const parsed = aiEstimateResultSchema.safeParse(attempt.result);
    if (!parsed.success) return failure("Uložený odhad sa nepodarilo načítať. Kontaktujte podporu.", 503);
    return NextResponse.json({ estimateId: attempt.id, result: parsed.data, createdAt: attempt.created_at, photoCount: attempt.photo_count } satisfies EstimateResponse, { headers });
  }
  const serverDb = createServiceSupabaseClient();
  try {
    const result = await generatePriceEstimate(input, service);
    const { error: saveError } = await serverDb.from("ai_estimates").update({
      status: "completed", result: result as Json, model: process.env.AI_ESTIMATE_MODEL!
    }).eq("id", attempt.id).eq("customer_id", profile.id).eq("status", "pending");
    if (saveError) throw new Error("Estimate persistence failed");
    return NextResponse.json({ estimateId: attempt.id, result, createdAt: attempt.created_at, photoCount: input.images.length } satisfies EstimateResponse, { headers });
  } catch (error) {
    await serverDb.from("ai_estimates").update({ status: "failed" }).eq("id", attempt.id).eq("customer_id", profile.id).eq("status", "pending");
    // Provider exceptions may include the entire request and private photographs.
    const errorCode = error instanceof Error ? ["customer_verification_required", "insufficient_funds", "quota_for_entity_exceeded"].find(code => error.message.includes(code)) : undefined;
    console.error("AI estimate failed", { estimateId: attempt.id, errorType: error instanceof Error ? error.name : "Unknown", errorCode: errorCode ?? "provider_or_validation_failed" });
    return failure("AI odhad sa teraz nepodaril. Skúste to neskôr alebo odošlite objednávku bez odhadu.", 503);
  }
}
