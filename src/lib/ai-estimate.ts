import { z } from "zod";

export const AI_PROMPT_VERSION = "fixlook-estimate-v1";
export const MAX_AI_BODY_BYTES = 2 * 1024 * 1024;
export const MAX_AI_IMAGE_BYTES = 200_000;
export const AI_ESTIMATE_DISCLAIMER = "Nezáväzný AI odhad pre vašu predstavu. Nie je to cenová ponuka ani požiadavka na platbu. Konečnú cenu a rozsah schválite v samostatnej ponuke.";

export const estimateInputSchema = z.object({
  serviceId: z.number().int().positive(),
  problemDescription: z.string().trim().min(10, "Opíšte problém aspoň 10 znakmi.").max(4000),
  city: z.string().trim().min(2, "Zadajte mesto pre odhad výjazdu.").max(100),
  images: z.array(z.string().max(Math.ceil(MAX_AI_IMAGE_BYTES / 3) * 4 + 40)).max(5)
}).strict();

const description = z.string().trim().min(1).max(600);
const euroRange = z.object({ min: z.number().finite().min(0).max(100000), max: z.number().finite().min(0).max(100000) });
export const modelEstimateSchema = z.object({
  kind: z.enum(["range", "inspection"]),
  summary: description,
  labor: euroRange.nullable(),
  materials: euroRange.nullable(),
  travel: euroRange.nullable(),
  assumptions: z.array(description).max(5),
  priceFactors: z.array(description).max(5),
  questions: z.array(description).max(4)
});

const centRange = z.object({ min: z.number().int().min(0).max(10_000_000), max: z.number().int().min(0).max(10_000_000) }).refine(v => v.max >= v.min);
const common = { summary: description, assumptions: z.array(description).max(5), priceFactors: z.array(description).max(5), questions: z.array(description).max(4) };
export const aiEstimateResultSchema = z.discriminatedUnion("kind", [
  z.object({ ...common, kind: z.literal("range"), labor: centRange, materials: centRange, travel: centRange, total: centRange }),
  z.object({ ...common, kind: z.literal("inspection"), labor: z.null(), materials: z.null(), travel: z.null(), total: z.null() })
]);
export type AiEstimateResult = z.infer<typeof aiEstimateResultSchema>;
export type EstimateInput = z.infer<typeof estimateInputSchema>;
export type EstimateResponse = { estimateId: string; result: AiEstimateResult; createdAt: string; photoCount: number };

export function normalizeEstimate(value: unknown): AiEstimateResult {
  const model = modelEstimateSchema.parse(value);
  if (model.kind === "inspection") {
    // Never surface invented amounts when the model cannot assess the scope.
    return aiEstimateResultSchema.parse({ ...model, labor: null, materials: null, travel: null, total: null });
  }
  if (!model.labor || !model.materials || !model.travel || !model.assumptions.length) throw new Error("Incomplete price estimate");
  const cents = (v: z.infer<typeof euroRange>) => {
    if (v.max < v.min) throw new Error("Reversed price range");
    return { min: Math.round(v.min * 100), max: Math.round(v.max * 100) };
  };
  const labor = cents(model.labor), materials = cents(model.materials), travel = cents(model.travel);
  const total = { min: labor.min + materials.min + travel.min, max: labor.max + materials.max + travel.max };
  if (total.max <= 0) throw new Error("Empty price estimate");
  // Totals are computed in integer cents by the server, never by the model or client.
  return aiEstimateResultSchema.parse({ ...model, labor, materials, travel, total });
}

export async function readEstimateBody(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("Invalid request body");
  if (Number(request.headers.get("content-length")) > MAX_AI_BODY_BYTES) throw new Error("Request too large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request body");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_AI_BODY_BYTES) { await reader.cancel(); throw new Error("Request too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
