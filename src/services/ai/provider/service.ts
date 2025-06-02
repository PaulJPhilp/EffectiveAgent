import { EntityParseError } from "@/errors.js";
import ConfigurationService from "@/services/core/configuration/service.js";
/**
 * @file Defines the ProviderService for loading, validating, and accessing AI provider configurations and clients.
 * @module services/ai/provider/service
 */
// ConfigurationService is no longer needed - configuration is provided by AgentRuntime
import { Effect, Ref, Schema as S } from "effect";
import { type ProviderClientApi, ProviderServiceApi } from "./api.js";
import { makeAnthropicClient } from "./clients/anthropic-provider-client.js";
import { makeDeepseekClient } from "./clients/deepseek-provider-client.js";
import { makeGoogleClient } from "./clients/google-provider-client.js";
import { makeGroqClient } from "./clients/groq-provider-client.js";
import { makeOpenAIClient } from "./clients/openai-provider-client.js";
import { makePerplexityClient } from "./clients/perplexity-provider-client.js";
import { makeXaiClient } from "./clients/xai-provider-client.js";
import { ProviderNotFoundError, ProviderOperationError, ProviderServiceConfigError } from "./errors.js";
import { ProviderFile, ProvidersType } from "./schema.js";

/**
 * Validates the parsed configuration against the ProviderFile schema
 * @param parsedConfig - The parsed configuration object
 * @param method - The method name for error context
 * @returns An Effect containing the validated ProviderFile or a ProviderServiceConfigError
 */
const validateProviderConfig = (parsedConfig: any, method: string) => {
    return Effect.gen(function* () {
        yield* Effect.logDebug("Validating provider configuration", { method });
        const result = yield* S.decode(ProviderFile)(parsedConfig);
        yield* Effect.logDebug("Provider configuration validated successfully");
        return result;
    }).pipe(
        Effect.tapError((cause) => Effect.logError("Provider configuration validation failed", { method, cause })),
        Effect.mapError(cause => new ProviderServiceConfigError({
            description: "Failed to validate provider config",
            module: "ProviderService",
            method,
            cause: new EntityParseError({
                filePath: "config",
                description: "Failed to parse provider config",
                module: "ProviderService",
                method,
                cause
            })
        }))
    );
};

// Implementation effect for ProviderService
export const providerServiceEffect = Effect.gen(function* () {
    const configService = yield* ConfigurationService;
    const configRef = yield* Ref.make<ProvidersType | null>(null);

    // Load configuration during service initialization 
    const providerConfigPath = process.env.PROVIDERS_CONFIG_PATH || "./config/providers.json";
    const rawConfig = yield* configService.loadProviderConfig(providerConfigPath).pipe(
        Effect.tapError((error) => Effect.logError("Failed to load provider configuration", { error }))
    );
    const validConfig = yield* validateProviderConfig(rawConfig, "initialize");
    yield* Ref.set(configRef, validConfig);
    yield* Effect.logInfo("Provider configuration loaded", { providers: validConfig.providers.map(p => p.name) });

    return {

        /**
         * Retrieves and configures a provider client for the specified provider
         * @param providerName - The name of the provider to use
         * @returns An Effect containing the configured provider client or an error
         * @throws ProviderServiceConfigError - If the provider configuration cannot be loaded or is invalid
         * @throws ProviderNotFoundError - If the specified provider is not found in the configuration
         * @throws ProviderOperationError - If there is an error configuring the provider
         */
        getProviderClient: (providerName: string) => {
            return Effect.gen(function* () {
                yield* Effect.logInfo("Getting provider client", { providerName });

                // Get config
                yield* Effect.logInfo("Checking config ref");
                const config = yield* Ref.get(configRef);
                if (!config) {
                    yield* Effect.logError("Provider config not loaded");
                    return yield* Effect.fail(new ProviderServiceConfigError({
                        description: "Provider configuration not loaded. Call load() first.",
                        module: "ProviderService",
                        method: "getProviderClient"
                    }));
                }
                yield* Effect.logInfo("Config found in ref", { providers: config.providers.map((p: { name: ProvidersType }) => p.name) });

                // Find the provider info
                const providerInfo = config.providers.find((p: { name: ProvidersType }) => p.name === providerName);
                if (!providerInfo) {
                    yield* Effect.logError("Provider not found", { providerName });
                    return yield* Effect.fail(new ProviderNotFoundError({
                        providerName,
                        module: "ProviderService",
                        method: "getProviderClient"
                    }));
                }

                // Check for API key env var
                const apiKeyEnvVar = providerInfo.apiKeyEnvVar;
                if (!apiKeyEnvVar) {
                    yield* Effect.logError("API key environment variable not configured", { providerName });
                    return yield* Effect.fail(new ProviderServiceConfigError({
                        description: `API key environment variable not configured for provider: ${providerName}`,
                        module: "ProviderService",
                        method: "getProviderClient"
                    }));
                }

                // Load the API key directly from process.env
                const apiKey = process.env[apiKeyEnvVar];
                if (!apiKey) {
                    yield* Effect.logError("API key not found in environment", { providerName, apiKeyEnvVar });
                    return yield* Effect.fail(new ProviderServiceConfigError({
                        description: `API key not found in environment: ${apiKeyEnvVar}`,
                        module: "ProviderService",
                        method: "getProviderClient"
                    }));
                }

                yield* Effect.logDebug("Configuring provider client", { providerName, apiKeyEnvVar });

                // Construct the ProviderClientApi directly for each provider
                switch (providerName) {
                    case "openai":
                        return yield* makeOpenAIClient(apiKey);
                    case "anthropic":
                        return yield* makeAnthropicClient(apiKey);
                    case "google":
                        return yield* makeGoogleClient(apiKey);
                    case "groq":
                        return yield* makeGroqClient(apiKey);
                    case "perplexity":
                        return yield* makePerplexityClient(apiKey);
                    case "xai":
                        return yield* makeXaiClient(apiKey);
                    case "deepseek":
                        return yield* makeDeepseekClient(apiKey);
                    default:
                        yield* Effect.logError("Provider client factory not implemented", { providerName });
                        return yield* Effect.fail(new ProviderServiceConfigError({
                            description: `Provider client factory not implemented for provider: ${providerName}`,
                            module: "ProviderService",
                            method: "getProviderClient"
                        }));
                }
            }) as Effect.Effect<ProviderClientApi, ProviderServiceConfigError | ProviderNotFoundError | ProviderOperationError>;
        },

        /**
         * Checks the health of the provider service
         */
        healthCheck: () => Effect.gen(function* () {
            // Verify configuration is loaded
            const config = yield* Ref.get(configRef);
            if (!config) {
                return yield* Effect.fail(new ProviderServiceConfigError({
                    description: "Provider service not properly initialized - configuration not loaded",
                    module: "ProviderService",
                    method: "healthCheck"
                }));
            }
            yield* Effect.logDebug("Provider service health check passed");
        }),

        /**
         * Shuts down the provider service and cleans up resources
         */
        shutdown: () => Effect.gen(function* () {
            yield* Ref.set(configRef, null);
            yield* Effect.logInfo("Provider service shutdown completed");
        })
    };
});

export class ProviderService extends Effect.Service<ProviderServiceApi>()(
    "ProviderService",
    {
        effect: providerServiceEffect,
        dependencies: [ConfigurationService.Default]
    }
) { }

