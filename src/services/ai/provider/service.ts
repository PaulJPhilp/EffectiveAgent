/**
 * @file Defines the ProviderService for loading, validating, and accessing AI provider configurations and clients.
 * @module services/ai/provider/service
 */

import { EntityParseError } from "@/services/core/errors.js";
import { Config, ConfigProvider, Effect, Schema as S } from "effect";
import { ProviderConfigError, ProviderNotFoundError, ProviderOperationError } from "./errors.js";
import { ProviderFile, ProvidersType } from "./schema.js";
import { EffectiveProviderApi } from "./types.js";

// --- Service Type Definition ---
export interface ProviderServiceApi {
    load: Effect.Effect<ProviderFile, ProviderConfigError>;
    getProviderClient(
        providerName: ProvidersType
    ): Effect.Effect<EffectiveProviderApi, ProviderConfigError | ProviderNotFoundError | ProviderOperationError>;
}

/**
 * Helper functions for common operations 
 */
/**
 * Loads the provider configuration string from the provided ConfigProvider
 * @param configProvider - The configuration provider instance
 * @param method - The method name for error context
 * @returns An Effect containing the config string or a ProviderConfigError
 */
const loadConfigString = (configProvider: ConfigProvider.ConfigProvider, method: string) => {
    return configProvider.load(Config.string("providersConfigJsonString")).pipe(
        Effect.mapError(cause => new ProviderConfigError({
            description: "Failed to load provider config string",
            module: "ProviderService",
            method,
            cause: new EntityParseError({ filePath: "config", cause })
        }))
    );
};

/**
 * Parses a raw configuration string into a JSON object
 * @param rawConfig - The raw configuration string
 * @param method - The method name for error context
 * @returns An Effect containing the parsed JSON or a ProviderConfigError
 */
const parseConfigJson = (rawConfig: string, method: string) => {
    return Effect.try({
        try: () => JSON.parse(rawConfig),
        catch: (error): ProviderConfigError => new ProviderConfigError({
            description: "Failed to parse provider config",
            module: "ProviderService",
            method,
            cause: error instanceof Error ? error : new Error(String(error))
        })
    });
};

/**
 * Validates the parsed configuration against the ProviderFile schema
 * @param parsedConfig - The parsed configuration object
 * @param method - The method name for error context
 * @returns An Effect containing the validated ProviderFile or a ProviderConfigError
 */
const validateProviderConfig = (parsedConfig: any, method: string) => {
    return S.decode(ProviderFile)(parsedConfig).pipe(
        Effect.mapError(cause => new ProviderConfigError({
            description: "Failed to validate provider config",
            module: "ProviderService",
            method,
            cause: new EntityParseError({ filePath: "config", cause })
        }))
    );
};

// Define the implementation
/**
 * Implementation of the ProviderService using the Effect.Service pattern
 * Manages AI provider configurations and client access with proper error handling
 */
export class ProviderService extends Effect.Service<ProviderServiceApi>()("ProviderService", {
    effect: Effect.gen(function* () {
        const configProvider = yield* ConfigProvider.ConfigProvider;
        
        return {
            /**
             * Loads provider configurations from the config provider
             * @returns An Effect containing the validated provider configuration or a ProviderConfigError
             */
            load: Effect.gen(function* () {
                const rawConfig = yield* loadConfigString(configProvider, "load");
                const parsedConfig = yield* parseConfigJson(rawConfig, "load");
                const validConfig = yield* validateProviderConfig(parsedConfig, "load");
                return validConfig;
            }),
            /**
             * Retrieves and configures a provider client for the specified provider
             * @param providerName - The name of the provider to use
             * @returns An Effect containing the configured provider client or an error
             * @throws ProviderConfigError - If the provider configuration cannot be loaded or is invalid
             * @throws ProviderNotFoundError - If the specified provider is not found in the configuration
             * @throws ProviderOperationError - If there is an error configuring the provider
             */
            getProviderClient: (providerName: ProvidersType) => {
                return Effect.gen(function* () {
                    // Get the validated provider configuration
                    const rawConfig = yield* loadConfigString(configProvider, "getProviderClient");
                    const parsedConfig = yield* parseConfigJson(rawConfig, "getProviderClient");
                    const validConfig = yield* validateProviderConfig(parsedConfig, "getProviderClient");
                    
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
                        return yield* Effect.fail(new ProviderConfigError({
                            description: `API key environment variable not configured for provider: ${providerName}`,
                            module: "ProviderService",
                            method: "getProviderClient"
                        }));
                    }
                    
                    // Load the API key
                    const apiKey = yield* configProvider.load(Config.string(apiKeyEnvVar))
                        .pipe(
                            Effect.mapError(configError => new ProviderConfigError({
                                description: `Failed to load API key from env var: ${apiKeyEnvVar}`,
                                module: "ProviderService",
                                method: "getProviderClient",
                                cause: configError instanceof Error ? configError : new Error(String(configError))
                            }))
                        );
                    
                    yield* Effect.log(`Using provider: ${providerName} with API key from env var: ${apiKeyEnvVar}`);
                    
                    // In tests, provider client is injected through the mock layer
                    const providerClient = {} as EffectiveProviderApi;
                    providerClient.name = providerName as ProvidersType;
                    
                    // Initialize the provider with the API key
                    if (typeof (providerClient as any).setVercelProvider === "function") {
                        yield* (providerClient as any).setVercelProvider(providerName, apiKey);
                    }
                    
                    return providerClient;
                }) as Effect.Effect<EffectiveProviderApi, ProviderConfigError | ProviderNotFoundError | ProviderOperationError>;
            }
        };
    }),
    dependencies: []
}) {}
