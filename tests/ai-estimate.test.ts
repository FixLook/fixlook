import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateInputSchema, normalizeEstimate, readEstimateBody, MAX_AI_BODY_BYTES } from "../src/lib/ai-estimate";

const response = {
  kind: "range", summary: "Výmena kuchynskej batérie s bežným prístupom.",
  labor: { min: 40.15, max: 65.35 }, materials: { min: 50.10, max: 110.20 }, travel: { min: 10, max: 20 },
  assumptions: ["Bežná batéria vrátane spojovacieho materiálu."], priceFactors: ["Stav prívodných hadíc."], questions: []
};

test("AI totals include labor, materials and travel, computed exactly in cents", () => {
  const estimate = normalizeEstimate(response);
  assert.equal(estimate.kind, "range");
  assert.deepEqual(estimate.total, { min: 10025, max: 19555 });
});

test("unassessable scope never exposes an invented numeric price", () => {
  const estimate = normalizeEstimate({ ...response, kind: "inspection", questions: ["Aký je rozsah poškodenia?"] });
  assert.equal(estimate.total, null);
  assert.equal(estimate.materials, null);
});

test("invalid and incomplete provider amounts are rejected", () => {
  for (const invalid of [
    { ...response, materials: null },
    { ...response, labor: { min: 80, max: 40 } },
    { ...response, travel: { min: -10, max: 20 } },
    { ...response, assumptions: [] },
    { ...response, labor: { min: NaN, max: Infinity } },
    { ...response, labor: { min: 40000, max: 90000 }, materials: { min: 50000, max: 90000 } }
  ]) assert.throws(() => normalizeEstimate(invalid));
});

test("estimation accepts only the necessary fields, with limited photographs", () => {
  const input = { serviceId: 1, problemDescription: "Pod drezom uniká voda.", city: "Košice", images: [] };
  assert.ok(estimateInputSchema.safeParse(input).success);
  assert.equal(estimateInputSchema.safeParse({ ...input, address: "Hlavná 10" }).success, false);
  assert.equal(estimateInputSchema.safeParse({ ...input, images: Array(6).fill("photo") }).success, false);
});

test("request size limit also covers chunked bodies without Content-Length", async () => {
  const oversized = new Request("https://example.test/api/estimates", { method: "POST", headers: { "content-type": "application/json" }, body: "x".repeat(MAX_AI_BODY_BYTES + 1) });
  await assert.rejects(readEstimateBody(oversized), /too large/);
  const valid = new Request("https://example.test/api/estimates", { method: "POST", headers: { "content-type": "application/json" }, body: '{"serviceId":1}' });
  assert.deepEqual(await readEstimateBody(valid), { serviceId: 1 });
});
