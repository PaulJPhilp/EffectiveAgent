import { ModelCapability } from "@/schema.js";
import { LoggingServiceApi } from "@/services/core/logging/api.js";
import { Config, ConfigProvider, Effect } from "effect";
import { ModelServiceApi } from "../model/api.js";
import { ModelService } from "../model/service.js";
import { ProviderConfigError, ProviderMissingCapabilityError, ProviderOperationError } from "./errors.js";
import { ProvidersType } from "./schema.js";

/**
 * Loads the provider configuration string from the provided ConfigProvider
 * @param configProvider - The configuration provider instance
 * @param method - The method name for error context
 * @returns An Effect containing the config string or a ProviderConfigError
 */
export const loadConfigString = (
  configProvider: ConfigProvider.ConfigProvider,
  method: string
): Effect.Effect<string, ProviderConfigError> => {
  return Effect.try({
    try: () => configProvider.load(Config.string("providersConfigJsonString")),
    catch: (error) =>
      new ProviderConfigError({
        description: "Failed to load provider config string (sync error)",
        module: "ProviderService",
        method,
        cause: error instanceof Error ? error : new Error(String(error))
      })
  }).pipe(
    Effect.flatten,
    Effect.mapError((cause) =>
      new ProviderConfigError({
        description: "Failed to load provider config string",
        module: "ProviderService",
        method,
        cause: cause instanceof Error ? cause : new Error(String(cause))
      })
    )
  );
};

/**
 * Parses a raw configuration string into a JSON object
 * @param rawConfig - The raw configuration string
 * @param method - The method name for error context
 * @returns An Effect containing the parsed JSON or a ProviderConfigError
 */
export const parseConfigJson = (
  rawConfig: string,
  method: string
): Effect.Effect<any, ProviderConfigError> => {
  return Effect.try({
    try: () => JSON.parse(rawConfig),
    catch: (error): ProviderConfigError =>
      new ProviderConfigError({
        description: "Failed to parse provider config",
        module: "ProviderService",
        method,
        cause: error instanceof Error ? error : new Error(String(error))
      })
  });
};

/**
 * Wraps a provider's result in a standardized response object with metadata.
 * @template T
 * @param result - The provider result to wrap
 * @returns Effect<EffectiveResponse<T>, never>
 */
export const createResponse = <T extends GenerateBaseResult>(result: T): Effect.Effect<EffectiveResponse<T>, never> =>
  Effect.succeed({
    data: result,
    metadata: {
      id: result.id,
      model: result.model,
      timestamp: result.timestamp,
      usage: result.usage,
      finishReason: result.finishReason,
      providerMetadata: result.providerMetadata
    }
  });


/**
 * Helper function for logging debug messages with consistent formatting
 * @param method - The method name for context
 * @param message - The message to log
 * @param data - Optional data to include in the log
 * @returns Effect<void, never>
 */

/**
 * Looks up the provider name for a given modelId, logs and maps errors.
 * @param params - Object with modelService, modelId, logger, and method
 * @returns Effect<string, ProviderConfigError>
 */
export function getProviderName(params: {
  modelService: ModelServiceApi;
  modelId: string;
  logger: LoggingServiceApi;
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
export const validateModelId = ({ options, method }: {
  options: { modelId?: string },
  method: string,
}): Effect.Effect<string, ProviderConfigError, ModelServiceApi> => Effect.gen(function* () {
  if (!options.modelId) {
    yield* Effect.logDebug(`[ProviderClient:${method}] No modelId provided, using default model`);
    const defaultId = yield* Effect.mapError(
      Effect.gen(function* () {
        const modelService = yield* ModelService;
        return yield* modelService.getDefaultModelId("openai" as const, ModelCapability.literals[1]);
      }),
      err => new ProviderConfigError({
        description: `Failed to get default model ID: ${err instanceof Error ? err.message : String(err)}`,
        module: "ProviderClient",
        method
      })
    );
    return defaultId;
  }

  const modelId = options.modelId;
  const exists = yield* Effect.mapError(
    Effect.gen(function* () {
      const modelService = yield* ModelService;
      return yield* modelService.exists(modelId);
    }),
    err => new ProviderConfigError({
      description: `Failed to check if model ${modelId} exists: ${err instanceof Error ? err.message : String(err)}`,
      module: "ProviderClient",
      method
    })
  );

  if (!exists) {
    throw new ProviderConfigError({
      description: `Model ${modelId} not found`,
      module: "ProviderClient",
      method
    });
  }

  return modelId;
});

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


