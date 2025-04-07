/**
 * @file Implements the ProviderConfiguration service for loading and accessing
 * AI provider configuration data (e.g., from provider.json).
 * NOTE: Effect.cached removed due to persistent type inference issues.
 */

import { Effect, Layer, Option, Context } from "effect";
import * as Record from "effect/Record"; // Use effect/Record utilities
// Assuming ConfigLoaderApi is correctly imported via index or direct path
import { ConfigLoaderApi, ConfigLoaderOptions } from "../../core/configuration/index.js";
import { FileSystem } from "@effect/platform/FileSystem";
import { Path } from "@effect/platform/Path";
// Import schema types and schema itself
import type { ProviderConfig, ProvidersConfig } from "./schema.js";
import { ProvidersConfigSchema } from "./schema.js";
// Import Tag/Interface and errors for this service
import { ProviderConfiguration } from "./types.js";
import { ProviderConfigurationError, ModelNotFoundError, ProviderError } from "./errors.js";

// Define the expected filename for the provider configuration
const CONFIG_FILENAME = "provider.json";

// --- Implementation ---

// Define the expected success type explicitly for annotation
type LoadedConfigType = {
    providers: Readonly<Record<string, ProviderConfig>>;
    defaultProviderName: string;
};

/**
 * Effect to load and validate the provider configuration.
 * NOTE: Caching removed. This runs on every call.
 * Requires ConfigLoaderApi and its transitive dependencies.
 */
const loadProvidersConfigEffect: Effect.Effect<LoadedConfigType, ProviderConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions> =
    Effect.gen(function* () {
        const configLoader = yield* ConfigLoaderApi;
        // Load and validate using the schema defined in this module
        const loadedConfig = yield* configLoader.loadConfig<ProvidersConfig>(CONFIG_FILENAME, {
            schema: ProvidersConfigSchema,
        });

        // Convert providers array to a Readonly Record for efficient lookup by name
        const providersRecord = Record.fromEntries(
            loadedConfig.providers.map((p) => [p.name, p])
        );

        // Return the processed configuration data
        return {
            providers: providersRecord,
            defaultProviderName: loadedConfig.defaultProviderName,
        };
    }).pipe(
        // Map ConfigLoader errors to ProviderConfigurationError for context
        Effect.mapError(
            (cause) => new ProviderConfigurationError({ message: `Failed to load or parse ${CONFIG_FILENAME}`, cause })
        )
        // REMOVED: .pipe(Effect.cached)
    );


/** Live implementation of the ProviderConfiguration service. */
class ProviderConfigurationLive implements ProviderConfiguration {
    // Helper Effect now points directly to the loading effect (no cache)
    private getConfig = (): Effect.Effect<LoadedConfigType, ProviderConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions> =>
        loadProvidersConfigEffect; // Use the non-cached effect

    // Implementation of getDefaultProviderName
    // Inherits requirements from getConfig
    getDefaultProviderName = (): Effect.Effect<string, ProviderConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions> =>
        this.getConfig().pipe(Effect.map((config) => config.defaultProviderName));

    // Implementation of getProviderConfigByName
    // Inherits requirements from getConfig
    getProviderConfigByName = (
        name: string
    ): Effect.Effect<ProviderConfig, ProviderConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions> =>
        this.getConfig().pipe(
            // FlatMap the result of getConfig
            Effect.flatMap((config) => {
                // Get the Option<ProviderConfig> synchronously
                const optionProviderConfig = Record.get(config.providers, name);

                // Use Option.match directly to return the appropriate Effect
                return Option.match(optionProviderConfig, {
                    onNone: () => Effect.fail(new ProviderConfigurationError({
                        message: `Provider configuration not found for name: ${name}`,
                        context: { providerName: name },
                    })),
                    onSome: (providerConfig) => Effect.succeed(providerConfig)
                });
            })
        );

    // Implementation of resolveModelId
    // Inherits requirements from getConfig/getProviderConfigByName
    resolveModelId = (
        modelId: string
    ): Effect.Effect<
        { providerConfig: ProviderConfig; resolvedModelName: string },
        ProviderError, // Can fail with ProviderConfigurationError or ModelNotFoundError
        ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions // Matches interface
    > => {
        // Capture 'this' context methods for use inside Effect pipeline
        const getConfigFunc = this.getConfig;
        const getProviderConfigByNameFunc = this.getProviderConfigByName;

        // Need to get the default name first, which also requires ConfigLoaderApi
        return getConfigFunc().pipe( // Start with getConfig
            Effect.flatMap(config => Effect.gen(function* () { // Use flatMap + gen
                let providerName: string | undefined;
                let modelNamePart: string | undefined;

                if (modelId.includes("/")) {
                    const parts = modelId.split("/", 2);
                    providerName = parts[0];
                    modelNamePart = parts[1];
                } else {
                    providerName = config.defaultProviderName; // Use resolved default
                    modelNamePart = modelId;
                }

                // Ensure both parts were successfully determined
                if (!providerName || !modelNamePart) {
                    // Fail if parsing failed or default name wasn't available (though getConfig should handle that)
                    return yield* Effect.fail(new ModelNotFoundError({
                        provider: providerName ?? "unknown", modelId: modelId,
                        message: `Could not parse provider/model from modelId: ${modelId}`,
                    }));
                }

                // Get the provider config using the determined name
                // This Effect requires ConfigLoaderApi | ...
                const providerConfig = yield* getProviderConfigByNameFunc(providerName).pipe(
                    // Map the ProviderConfigurationError to ModelNotFoundError for consistency
                    Effect.mapError((e) => new ModelNotFoundError({
                        provider: providerName!, // We know providerName is defined here
                        modelId: modelId,
                        message: `Provider configuration not found for '${providerName}' while resolving modelId '${modelId}'.`,
                        cause: e
                    }))
                );

                // At this point, modelNamePart is guaranteed to be a string
                // because the only way to reach here is if the initial check passed.
                // TypeScript might need help seeing this, but let's assume it works first.
                // If TS still complains about modelNamePart being potentially undefined,
                // we might need an explicit assertion `modelNamePart!` but it shouldn't be necessary.
                return { providerConfig: providerConfig, resolvedModelName: modelNamePart };
            }))
        );
    }
}

// --- Layer Definition ---

/**
 * Live Layer for the ProviderConfiguration service.
 * Requires ConfigLoaderApi AND its dependencies (FileSystem, Path, ConfigLoaderOptions)
 * because the underlying implementation requires them.
 */
export const ProviderConfigurationLiveLayer: Layer.Layer<ProviderConfiguration, never, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions> =
    Layer.succeed(
        ProviderConfiguration, // The Tag for this service
        new ProviderConfigurationLive() // The implementation instance
    );
