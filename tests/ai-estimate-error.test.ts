import test from "node:test";
import assert from "node:assert/strict";
import { classifyEstimateError } from "../src/lib/ai-estimate-error";

test("AI diagnostics identify wrapped account errors without exposing request data", () => {
  const error = new Error("Generation failed", { cause: Object.assign(new Error("Private request"), { responseBody: '{"error":{"code":"customer_verification_required"},"request":"PRIVATE_PHOTO"}' }) });
  assert.equal(classifyEstimateError(error), "customer_verification_required");
  assert.equal(classifyEstimateError(Object.assign(new Error("private customer description"), { name: "GatewayAuthenticationError" })), "authentication_error");
  assert.equal(classifyEstimateError(new Error("PRIVATE_KEY and PRIVATE_PHOTO")), "provider_or_validation_failed");
  assert.equal(classifyEstimateError(null), "provider_or_validation_failed");
  const cyclic: { cause?: unknown } = {}; cyclic.cause = cyclic;
  assert.equal(classifyEstimateError(cyclic), "provider_or_validation_failed");
});
