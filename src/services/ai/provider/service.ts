import { ConfigurationService } from "@/services/core/configuration/service.js";
import { ResilienceService } from "@/services/execution/resilience/service.js";
import { Duration, Effect, Ref, Schedule } from "effect";
import type {
  CircuitBreakerConfig,
  RetryPolicy,
} from "@/services/execution/resilience/types.js";
import { ProviderServiceApi } from "./api.js";
import { makeAnthropicClient } from "./clients/anthropic-provider-client.js";
import { makeDeepseekClient } from "./clients/deepseek-provider-client.js";
import { makeGoogleClient } from "./clients/google-provider-client.js";
import { makeOpenAIClient } from "./clients/openai-provider-client.js";
import { makePerplexityClient } from "./clients/perplexity-provider-client.js";
import { makeQwenClient } from "./clients/qwen-provider-client.js";
import { makeXaiClient } from "./clients/xai-provider-client.js";
import {
  ProviderNotFoundError,
  ProviderServiceConfigError,
  ProviderOperationError,
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

const PROVIDER_CIRCUIT_BREAKER: CircuitBreakerConfig = {
  name: "provider-service-api",
  failureThreshold: 5,
  resetTimeout: Duration.seconds(30),
  halfOpenMaxAttempts: 2,
};

const makeProviderService = Effect.gen(function* () {
  const configService = yield* ConfigurationService;
  const resilience = yield* ResilienceService;

  const masterConfig = yield* configService.getMasterConfig();
  const providersConfigPath =
    masterConfig.configPaths?.providers || "./config/providers.json";
  const providersConfig = yield* configService.loadConfig(
    providersConfigPath,
    ProviderFile
  );

  // Helper function to wrap provider operations with resilience
  const withProviderResilience = <A, E>(
    operation: Effect.Effect<A, E, never>,
    operationName: string,
    providerName: string
  ): Effect.Effect<A, E, never> => {
    return Effect.gen(function* () {
      const metrics = yield* resilience.getCircuitBreakerMetrics(
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
              method: "getProviderClient",
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
              method: "getProviderClient",
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
              method: "getProviderClient",
            })
          );
        }

        // Create provider-specific client based on provider type with resilience
        const clientEffect = (() => {
          switch (providerInfo.name) {
            case "openai":
              return makeOpenAIClient(apiKey);
            case "anthropic":
              return makeAnthropicClient(apiKey);
            case "google":
              return makeGoogleClient(apiKey);
            case "deepseek":
              return makeDeepseekClient(apiKey);
            case "perplexity":
              return makePerplexityClient(apiKey);
            case "qwen":
              return makeQwenClient(apiKey);
            case "xai":
              return makeXaiClient(apiKey);
            default:
              return Effect.fail(
                new ProviderNotFoundError({
                  providerName,
                  module: "ProviderService",
                  method: "getProviderClient",
                })
              );
          }
        })();

        // Apply resilience patterns to provider client creation
        const resilientClientEffect = withProviderResilience(
          clientEffect,
          "getProviderClient",
          providerName
        );

        // Apply retry with exponential backoff for provider client creation
        return yield* Effect.retry(resilientClientEffect, {
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
  };
});

export class ProviderService extends Effect.Service<ProviderServiceApi>()(
  "ProviderService",
  {
    effect: makeProviderService,
    dependencies: [ConfigurationService.Default, ResilienceService.Default],
  }
) {}
