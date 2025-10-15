import { createProvider, getEmbeddingModel, getLanguageModel, type ProviderName } from "@effective-agent/ai-sdk";
import { Duration, Effect, Schedule } from "effect";
import { ModelsRegistryService } from "@/services/ai/model/registry";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { ResilienceService } from "@/services/execution/resilience/service.js";
import type {
  CircuitBreakerConfig,
  RetryPolicy,
} from "@/services/execution/resilience/types.js";
import type { ProviderServiceApi } from "./api.js";
import {
  ProviderNotFoundError,
  ProviderOperationError,
  ProviderServiceConfigError
} from "./errors.js";
import { ProviderFile } from "./schema.js";

// Resilience configuration for provider operations
const PROVIDER_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelay: Duration.millis(500),
  maxDelay: Duration.seconds(10),
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [],
  nonRetryableErrors: ["ProviderNotFoundError", "ProviderServiceConfigError"],
};

const _PROVIDER_CIRCUIT_BREAKER: CircuitBreakerConfig = {
  name: "provider-service-api",
  failureThreshold: 5,
  resetTimeout: Duration.seconds(30),
  halfOpenMaxAttempts: 2,
};

const makeProviderService = Effect.gen(function* () {
  const configService = yield* ConfigurationService;
  const resilience = yield* ResilienceService;

  const masterCfg = yield* configService.getMasterConfig();
  const providersConfigPath = masterCfg.configPaths?.providers || "./config/providers.json";
  const providersConfig = yield* configService.loadConfig(
    providersConfigPath,
    ProviderFile
  );

  // Also load local models manifest so we can validate providers against canonical model registry
  const modelsConfigPath = masterCfg.configPaths?.models || "./config/models.json";
  const modelsConfig = yield* configService.loadModelConfig(modelsConfigPath);

  // Fetch global canonical models from injected ModelsRegistry
  let globalModels: any[] = [];
  try {
    const registry = yield* ModelsRegistryService;
    const list = yield* registry.list;
    globalModels = list as any[];
  } catch (err) {
    yield* Effect.logError("Failed to fetch models registry", { err });
    return yield* Effect.fail(new ProviderServiceConfigError({ description: "Failed to fetch models registry", module: "ProviderService", method: "init" }));
  }

  // Validate and hydrate local models referenced by providers
  for (const localModel of modelsConfig.models) {
    const match = globalModels.find((gm: any) => gm.id === localModel.id || gm.modelId === localModel.id || gm.name === localModel.id);
    if (!match) {
      yield* Effect.logError("Local model not found in models.dev registry", { modelId: localModel.id });
      return yield* Effect.fail(
        new ProviderServiceConfigError({
          description: `Local model not found in models registry: ${localModel.id}`,
          module: "ProviderService",
          method: "init",
        })
      );
    }
    // Shallow merge canonical fields into local model object
    Object.assign(localModel, match);
  }

  // Helper function to wrap provider operations with resilience
  const withProviderResilience = <A, E, R>(
    operation: Effect.Effect<A, E, R>,
    operationName: string,
    providerName: string
  ): Effect.Effect<A, E, R> => {
    return Effect.gen(function* () {
      const _metrics = yield* resilience.getCircuitBreakerMetrics(
        "provider-service-api"
      );
      const result = yield* operation;
      yield* Effect.logDebug(
        `Provider operation '${operationName}' for '${providerName}' completed successfully`
      );
      return result;
    }).pipe(
      Effect.catchAll((error: E) => {
        return Effect.gen(function* () {
          yield* Effect.logWarning(
            `Provider operation '${operationName}' for '${providerName}' failed`,
            { error }
          );
          return yield* Effect.fail(error);
        });
      })
    );
  };

  return {
    getProviderClient: (providerName: string) =>
      Effect.gen(function* () {
        yield* Effect.logWarning(
          "getProviderClient is deprecated",
          {
            providerName,
            message: "Use getAiSdkLanguageModel or getAiSdkEmbeddingModel instead. Provider client layer is being phased out."
          }
        );

        return yield* Effect.fail(
          new ProviderOperationError({
            operation: "getProviderClient",
            message: "getProviderClient is deprecated. Use ai-sdk operations directly via getAiSdkLanguageModel or getAiSdkEmbeddingModel.",
            providerName,
            module: "ProviderService",
            method: "getProviderClient",
          })
        );
      }),

    getAiSdkProvider: (providerName: string) =>
      Effect.gen(function* () {
        const providerInfo = providersConfig.providers.find(
          (p) => p.name === providerName
        );

        if (!providerInfo) {
          yield* Effect.logError("Provider not found in configuration", {
            providerName,
            availableProviders: providersConfig.providers.map((p) => p.name),
          });
          return yield* Effect.fail(
            new ProviderNotFoundError({
              providerName,
              module: "ProviderService",
              method: "getAiSdkProvider",
            })
          );
        }

        const apiKeyEnvVar = providerInfo.apiKeyEnvVar;
        if (!apiKeyEnvVar) {
          yield* Effect.logError(
            "API key environment variable not configured",
            {
              providerName,
            }
          );
          return yield* Effect.fail(
            new ProviderServiceConfigError({
              description: `API key environment variable not configured for provider: ${providerName}`,
              module: "ProviderService",
              method: "getAiSdkProvider",
            })
          );
        }

        const apiKey = process.env[apiKeyEnvVar];

        if (!apiKey) {
          yield* Effect.logError("API key not found in environment", {
            providerName,
            apiKeyEnvVar,
          });
          return yield* Effect.fail(
            new ProviderServiceConfigError({
              description: `API key not found in environment for provider: ${providerName} (${apiKeyEnvVar})`,
              module: "ProviderService",
              method: "getAiSdkProvider",
            })
          );
        }

        // Validate provider name is supported by ai-sdk
        const supportedProviders: ProviderName[] = [
          "openai",
          "anthropic",
          "google",
          "deepseek",
          "perplexity",
          "qwen",
          "xai",
          "groq",
        ];

        if (!supportedProviders.includes(providerInfo.name as ProviderName)) {
          return yield* Effect.fail(
            new ProviderNotFoundError({
              providerName,
              module: "ProviderService",
              method: "getAiSdkProvider",
            })
          );
        }

        // Create AI SDK provider
        const providerEffect = createProvider(providerInfo.name as ProviderName, {
          apiKey,
          baseURL: providerInfo.baseUrl,
        });

        // Apply resilience patterns to provider creation
        const resilientProviderEffect = withProviderResilience(
          providerEffect,
          "getAiSdkProvider",
          providerName
        );

        // Apply retry with exponential backoff for provider creation
        return yield* Effect.retry(resilientProviderEffect, {
          times: PROVIDER_RETRY_POLICY.maxAttempts - 1,
          schedule: Schedule.exponential(
            PROVIDER_RETRY_POLICY.baseDelay,
            PROVIDER_RETRY_POLICY.backoffMultiplier
          ).pipe(
            Schedule.compose(Schedule.elapsed),
            Schedule.whileOutput((duration) =>
              Duration.lessThan(duration, PROVIDER_RETRY_POLICY.maxDelay)
            )
          ),
        });
      }),

    getAiSdkLanguageModel: (providerName: string, modelId: string) =>
      Effect.gen(function* () {
        // Get provider info
        const providerInfo = providersConfig.providers.find(
          (p) => p.name === providerName
        );

        if (!providerInfo) {
          return yield* Effect.fail(
            new ProviderNotFoundError({
              providerName,
              module: "ProviderService",
              method: "getAiSdkLanguageModel",
            })
          );
        }

        const apiKeyEnvVar = providerInfo.apiKeyEnvVar;
        if (!apiKeyEnvVar) {
          return yield* Effect.fail(
            new ProviderServiceConfigError({
              description: `API key environment variable not configured for provider: ${providerName}`,
              module: "ProviderService",
              method: "getAiSdkLanguageModel",
            })
          );
        }

        const apiKey = process.env[apiKeyEnvVar];
        if (!apiKey) {
          return yield* Effect.fail(
            new ProviderServiceConfigError({
              description: `API key not found in environment for provider: ${providerName} (${apiKeyEnvVar})`,
              module: "ProviderService",
              method: "getAiSdkLanguageModel",
            })
          );
        }

        // Create provider and get model
        const provider = yield* createProvider(providerInfo.name as ProviderName, {
          apiKey,
          baseURL: providerInfo.baseUrl,
        });

        const modelEffect = getLanguageModel(provider, modelId);

        // Apply resilience patterns to model creation
        const resilientModelEffect = withProviderResilience(
          modelEffect,
          "getAiSdkLanguageModel",
          providerName
        );

        return yield* resilientModelEffect;
      }),

    getAiSdkEmbeddingModel: (providerName: string, modelId: string) =>
      Effect.gen(function* () {
        // Get provider info
        const providerInfo = providersConfig.providers.find(
          (p) => p.name === providerName
        );

        if (!providerInfo) {
          return yield* Effect.fail(
            new ProviderNotFoundError({
              providerName,
              module: "ProviderService",
              method: "getAiSdkEmbeddingModel",
            })
          );
        }

        const apiKeyEnvVar = providerInfo.apiKeyEnvVar;
        if (!apiKeyEnvVar) {
          return yield* Effect.fail(
            new ProviderServiceConfigError({
              description: `API key environment variable not configured for provider: ${providerName}`,
              module: "ProviderService",
              method: "getAiSdkEmbeddingModel",
            })
          );
        }

        const apiKey = process.env[apiKeyEnvVar];
        if (!apiKey) {
          return yield* Effect.fail(
            new ProviderServiceConfigError({
              description: `API key not found in environment for provider: ${providerName} (${apiKeyEnvVar})`,
              module: "ProviderService",
              method: "getAiSdkEmbeddingModel",
            })
          );
        }

        // Create provider and get model
        const provider = yield* createProvider(providerInfo.name as ProviderName, {
          apiKey,
          baseURL: providerInfo.baseUrl,
        });

        const modelEffect = getEmbeddingModel(provider, modelId);

        // Apply resilience patterns to model creation
        const resilientModelEffect = withProviderResilience(
          modelEffect,
          "getAiSdkEmbeddingModel",
          providerName
        );

        return yield* resilientModelEffect;
      }),
  };
});

export class ProviderService extends Effect.Service<ProviderServiceApi>()(
  "ProviderService",
  {
    effect: makeProviderService,
    dependencies: [ConfigurationService.Default, ResilienceService.Default, ModelsRegistryService.Default],
  }
) { }
