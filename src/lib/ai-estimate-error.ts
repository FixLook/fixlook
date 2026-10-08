const providerCodes = ["customer_verification_required", "insufficient_funds", "quota_for_entity_exceeded"] as const;
const errorNames = {
  GatewayAuthenticationError: "authentication_error",
  GatewayForbiddenError: "provider_forbidden",
  GatewayInvalidRequestError: "invalid_request",
  GatewayModelNotFoundError: "model_not_found",
  GatewayFailedDependencyError: "provider_dependency_failed",
  GatewayRateLimitError: "provider_rate_limit",
  NoObjectGeneratedError: "invalid_output",
  AI_NoObjectGeneratedError: "invalid_output",
  ZodError: "invalid_output",
  AbortError: "timeout",
  TimeoutError: "timeout"
} as const;

export type EstimateErrorCode = typeof providerCodes[number] | typeof errorNames[keyof typeof errorNames] | "server_configuration" | "persistence_failed" | "provider_or_validation_failed";

// Provider exceptions may include request bodies, credentials and photographs.
// Only a fixed vocabulary is ever returned to a client or written to logs.
export function classifyEstimateError(error: unknown): EstimateErrorCode {
  let current = error;
  let category: EstimateErrorCode = "provider_or_validation_failed";
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth++) {
    const value = current as { name?: unknown; message?: unknown; responseBody?: unknown; cause?: unknown };
    for (const field of [value.message, value.responseBody]) {
      if (typeof field !== "string") continue;
      const code = providerCodes.find(code => field.includes(code));
      if (code) return code;
    }
    if (value.message === "SUPABASE_SERVICE_ROLE_KEY is required for this operation.") return "server_configuration";
    if (value.message === "Estimate persistence failed") return "persistence_failed";
    if (typeof value.name === "string" && Object.prototype.hasOwnProperty.call(errorNames, value.name)) category = errorNames[value.name as keyof typeof errorNames];
    current = value.cause;
  }
  return category;
}
