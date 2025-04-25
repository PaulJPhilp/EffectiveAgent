import { randomUUID } from "node:crypto";
import type { EffectiveResponse, GenerateBaseResult } from "./types.js";
import { ProviderOperationError, ProviderConfigError, ProviderMissingCapabilityError } from "./errors.js";
import { ModelServiceApi } from "../model/service.js";
import { LoggingApi } from "@/services/core/logging/types.js";
import { Effect } from "effect";
import { ProvidersType } from "./schema.js";
import { ModelCapability } from "@/schema.js";

/**
 * Wraps a provider's result in a standardized response object with metadata.
 * @template T
 * @param {T} result - The provider result to wrap
 * @returns {EffectiveResponse<T>} The standardized response
 */
export function createResponse<T extends GenerateBaseResult>(result: T): EffectiveResponse<T> {
  return {
    data: result,
    metadata: {
      id: randomUUID(),
      timestamp: new Date(),
      usage: result.usage,
      finishReason: result.finishReason,
      providerMetadata: result.providerMetadata
    }
  };
}

/**
 * Looks up the provider name for a given modelId, logs and maps errors.
 * @param params - Object with modelService, modelId, logger, and method
 * @returns Effect<string, ProviderConfigError>
 */
export function getProviderName(params: {
  modelService: ModelServiceApi;
  modelId: string;
  logger: LoggingApi;
  method: string;
}): Effect.Effect<string, ProviderConfigError> {
  const { modelService, modelId, logger, method } = params;
  return modelService.getProviderName(modelId).pipe(
    Effect.tapError((err) =>
      logger.error(
        `Provider lookup failed for modelId ${modelId}: ${err instanceof Error ? err.message : String(err)}`
      )
    ),
    Effect.mapError(
      (err) =>
        new ProviderConfigError({
          description: `Provider lookup failed for modelId ${modelId}: ${err instanceof Error ? err.message : String(err)}`,
          module: "ProviderClient",
          method
        })
    )
  );
}

/**
 * Validates that a modelId is present in options. Returns an error if missing.
 * Logging is handled at the service layer.
 * @param params - Object with options and method
 * @returns Effect<string, ProviderConfigError>
 */
export function validateModelId(params: {
  options: { modelId?: string };
  method: string;
}): Effect.Effect<string, ProviderConfigError> {
  const { options, method } = params;
  return Effect.gen(function* () {
    const { modelId } = options;
    if (!modelId) {
      yield* Effect.fail(
        new ProviderConfigError({
          description: "No modelId provided in ProviderGenerateTextOptions",
          module: "ProviderClient",
          method
        })
      );
    }
    return modelId!;
  });
}

/**
 * Converts an unknown error to a ProviderOperationError or ProviderConfigError.
 * @param operation - The operation being performed (e.g., 'generateText')
 * @param err - The unknown error thrown
 * @param providerName - Optional provider name for context
 * @returns ProviderOperationError | ProviderConfigError
 */
/**
 * Converts an unknown error to a ProviderOperationError or ProviderConfigError (RO-RO style).
 * @param params - Object containing operation, err, and providerName
 * @returns ProviderOperationError | ProviderConfigError
 */
/**
 * Converts an unknown error to a ProviderOperationError or ProviderConfigError (RO-RO style).
 * @param params - Object containing operation, err, providerName, module, and method
 * @returns ProviderOperationError | ProviderConfigError
 */
export function handleProviderError(params: {
  operation: string;
  err: unknown;
  providerName?: string;
  module: string;
  method: string;
}): ProviderOperationError | ProviderConfigError {

  const { operation, err, providerName, module, method } = params;
  if (err instanceof ProviderOperationError || err instanceof ProviderConfigError) {
    return err;
  }
  const message: string = err instanceof Error ? err.message : String(err);
  const cause: Error | undefined = err instanceof Error ? err : undefined;
  return new ProviderOperationError({
    operation,
    message,
    providerName: providerName ?? "unknown",
    module,
    method,
    cause
  });
}

  /**
   * Validates that the provider supports the required capabilities.
   * @param params - Object with providerName, required, actual, logger, and method
   * @returns Effect<void, ProviderMissingCapabilityError>
   */
// logger is now expected to be available from closure or module scope
/**
 * Validates that the provider supports the required capabilities. Returns an error if missing.
 * Logging is handled at the service layer.
 */
export function validateCapabilities(params: {
  providerName: ProvidersType;
  required: ModelCapability | ModelCapability[];
  actual: Set<ModelCapability>;
  method: string;
}): Effect.Effect<void, ProviderMissingCapabilityError> {
    const { providerName, required, actual, method } = params;
    const requiredArr = Array.isArray(required) ? required : [required];
    for (const capability of requiredArr) {
      if (!actual.has(capability)) {
        return Effect.fail(
          new ProviderMissingCapabilityError({
            providerName: providerName as any, // Use ProvidersType if available
            capability,
            module: "ProviderClient",
            method
          })
        );
      }
    }
    return Effect.void;
  }


