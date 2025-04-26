import { randomUUID } from "node:crypto";
import type { Effect } from "effect";
import { Effect as EffectNS } from "effect";
import type { EffectiveResponse, GenerateBaseResult } from "./types.js";
import { ProviderOperationError } from "../provider/errors.js";

/**
 * Type guard for EffectiveResponse
 */
export function isEffectiveResponse(obj: unknown): obj is EffectiveResponse<unknown> {
  return (
    typeof obj === 'object' && obj !== null && 'data' in obj && 'metadata' in obj
  );
}

/**
 * Wraps a provider's result in a standardized response object with metadata.
 * Throws if already wrapped.
 */
export function createResponse<T extends GenerateBaseResult>(
  result: T | EffectiveResponse<T>
): Effect.Effect<EffectiveResponse<T>, ProviderOperationError> {
  if (isEffectiveResponse(result)) {
    return EffectNS.fail(
      new ProviderOperationError({
        operation: 'createResponse',
        message: 'Attempted to wrap an already wrapped EffectiveResponse. Double-wrapping is not allowed.',
        providerName: 'unknown',
        module: 'EffectivePipeline',
        method: 'createResponse'
      })
    );
  }
  return EffectNS.succeed({
    data: result,
    metadata: {
      id: randomUUID(),
      timestamp: new Date(),
      usage: result.usage,
      finishReason: result.finishReason,
      providerMetadata: result.providerMetadata
    }
  });
}
