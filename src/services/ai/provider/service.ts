import { EntityParseError } from "@/errors.js";
/**
 * @file Defines the ProviderService for loading, validating, and accessing AI provider configurations and clients.
 * @module services/ai/provider/service
 */
import { ConfigurationService } from "@/services/core/configuration/service.js";        
import { Effect, Schema as S } from "effect";
import { ProviderServiceApi, type ProviderClientApi } from "./api.js";
import { makeAnthropicClient } from "./clients/anthropic-provider-client.js";
import { makeDeepseekClient } from "./clients/deepseek-provider-client.js";
import { makeGoogleClient } from "./clients/google-provider-client.js";
import { makeGroqClient } from "./clients/groq-provider-client.js";
import { makeOpenAIClient } from "./clients/openai-provider-client.js";
import { makePerplexityClient } from "./clients/perplexity-provider-client.js";
import { makeXaiClient } from "./clients/xai-provider-client.js";
import { ProviderServiceConfigError, ProviderNotFoundError, ProviderOperationError } from "./errors.js";
import { ProviderFile, ProvidersType } from "./schema.js";

/**
 * Validates the parsed configuration against the ProviderFile schema
 * @param parsedConfig - The parsed configuration object
 * @param method - The method name for error context
 * @returns An Effect containing the validated ProviderFile or a ProviderServiceConfigError
 */
const validateProviderConfig = (parsedConfig: any, method: string) => {
    return S.decode(ProviderFile)(parsedConfig).pipe(
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

// Define the implementation
/**
 * Implementation of the ProviderService using the Effect.Service pattern
 * Manages AI provider configurations and client access with proper error handling
 */

export const providerServiceImplEffect = Effect.gen(function* () {
    const configService = yield* ConfigurationService;

    return {
        /**
         * Loads provider configurations from the config provider
         * @returns An Effect containing the validated provider configuration or a ProviderServiceConfigError
         */
        load: Effect.gen(function* () {
            const configPath = process.env.PROVIDERS_CONFIG_PATH ?? "./config/providers.json";
            const rawConfig = yield* configService.loadConfig({ filePath: configPath, schema: ProviderFile });
            const validConfig = yield* validateProviderConfig(rawConfig, "load");
            return validConfig;
        }),
        /**
         * Retrieves and configures a provider client for the specified provider
         * @param providerName - The name of the provider to use
         * @returns An Effect containing the configured provider client or an error
         * @throws ProviderServiceConfigError - If the provider configuration cannot be loaded or is invalid
         * @throws ProviderNotFoundError - If the specified provider is not found in the configuration
         * @throws ProviderOperationError - If there is an error configuring the provider
         */
        getProviderClient: (providerName: ProvidersType) => {
            return Effect.gen(function* () {
                const configPath = process.env.PROVIDERS_CONFIG_PATH ?? "./config/providers.json";
                // Get the validated provider configuration
                const rawConfig = yield* configService.loadConfig({ filePath: configPath, schema: ProviderFile });
                const validConfig = yield* validateProviderConfig(rawConfig, "getProviderClient");

                // Find the provider info
                const providerInfo = validConfig.providers.find(p => p.name === providerName);
                if (!providerInfo) {
                    return yield* Effect.fail(new ProviderNotFoundError({
                        providerName,
                        module: "ProviderService",
                        method: "getProviderClient"
                    }));
                }

                // Check for API key env var
                const apiKeyEnvVar = providerInfo.apiKeyEnvVar;
                if (!apiKeyEnvVar) {
                    return yield* Effect.fail(new ProviderServiceConfigError({
                        description: `API key environment variable not configured for provider: ${providerName}`,
                        module: "ProviderService",
                        method: "getProviderClient"
                    }));
                }

                // Load the API key directly from process.env
                const apiKey = process.env[apiKeyEnvVar];
                if (!apiKey) {
                    return yield* Effect.fail(new ProviderServiceConfigError({
                        description: `API key not found in environment: ${apiKeyEnvVar}`,
                        module: "ProviderService",
                        method: "getProviderClient"
                    }));
                }

                yield* Effect.log(`Using provider: ${providerName} with API key from env var: ${apiKeyEnvVar}`);

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
                        return yield* Effect.fail(new ProviderServiceConfigError({
                            description: `Provider client factory not implemented for provider: ${providerName}`,
                            module: "ProviderService",
                            method: "getProviderClient"
                        }));
                }
            }) as Effect.Effect<ProviderClientApi, ProviderServiceConfigError | ProviderNotFoundError | ProviderOperationError>;
        }
    };
});

export class ProviderService extends Effect.Service<ProviderServiceApi>()(
    "ProviderService",
    {
        effect: providerServiceImplEffect,
        dependencies: [ConfigurationService.Default]
    }
) { }

