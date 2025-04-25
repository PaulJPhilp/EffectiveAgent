import type { ModelServiceApi } from "./model/service.js";
import { Schema as S } from "effect";
import type { LoggingApi } from "./logging.js";
import { ProviderMissingCapabilityError } from "./errors.js";

const allowedCapabilities = [
  "text-generation",
  "chat",
  "function-calling",
  "vision",
  "reasoning",
  "code-generation",
  "audio",
  "image-generation",
  "embeddings",
  "tool-use"
] as const;
export type AllowedCapability = typeof allowedCapabilities[number];

/**
 * Validates that the model supports the specified capability.
 * Logs a warning and fails with ProviderMissingCapabilityError if not.
 * @param modelService - The model service instance
 * @param modelId - The model ID to validate
 * @param capability - The required capability (string)
 * @param logger - LoggingApi instance
 * @param method - Name of the calling method for error context
 * @param providerName - Provider name for error context
 * @returns Effect<string, ProviderMissingCapabilityError>
 */
export const validateModelCapability = (
  modelService: ModelServiceApi,
  modelId: string,
  capability: string,
  logger: LoggingApi,
  method: string,
  providerName: string
): import("effect").Effect<string, ProviderMissingCapabilityError> =>
  Effect.gen(function* () {
    if (!allowedCapabilities.includes(capability as AllowedCapability)) {
      yield* logger.error(`Invalid capability: ${capability}`);
      yield* Effect.fail(
        new ProviderMissingCapabilityError({
          providerName,
          capability,
          module: "ProviderClient",
          method
        })
      );
      return undefined as never;
    }
    const isValid = yield* modelService.validateModel(modelId, S.Literal(capability as AllowedCapability));
    if (!isValid) {
      yield* logger.warn(
        `Model ${modelId} does not support ${capability} capability`
      );
      yield* Effect.fail(
        new ProviderMissingCapabilityError({
          providerName,
          capability,
          module: "ProviderClient",
          method
        })
      );
      return undefined as never;
    }
    return modelId;
  });
