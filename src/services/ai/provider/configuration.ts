/**
 * @file Implements the ProviderConfiguration service for loading and accessing
 * AI provider configuration data (e.g., from provider.json).
 */

import { Effect, Layer, Option, Context } from "effect";
import * as Record from "effect/Record"; // <--- Import * as Record from "effect/Record"
import { ConfigLoaderApi } from "../../core/configuration/index.js";
import type { ProviderConfig, ProvidersConfig } from "./schema.js";
import { ProvidersConfigSchema } from "./schema.js";
import { ProviderConfiguration } from "./types.js";
import { ProviderConfigurationError, ModelNotFoundError, ProviderError } from "./errors.js";

const CONFIG_FILENAME = "provider.json";

// --- Implementation ---

/** Effect to load, validate, and potentially cache the provider configuration. */
const loadAndCacheProvidersConfig = Effect.gen(function* () {
    const configLoader = yield* ConfigLoaderApi;
    const loadedConfig = yield* configLoader.loadConfig(CONFIG_FILENAME, {
        schema: ProvidersConfigSchema,
    });
    // Use Record.fromEntries from effect/Record
    const providersRecord = Record.fromEntries( // <--- Use Record.fromEntries
        loadedConfig.providers.map((p) => [p.name, p])
    );
    return {
        providers: providersRecord, // Type is Readonly<Record<string, ProviderConfig>>
        defaultProviderName: loadedConfig.defaultProviderName,
    };
}).pipe(
    Effect.mapError(
        (cause) => new ProviderConfigurationError({ message: `Failed to load ${CONFIG_FILENAME}`, cause })
    ),
    Effect.cached // Simple time-unbounded cache
);

/** Live implementation of the ProviderConfiguration service. */
class ProviderConfigurationLive implements ProviderConfiguration {
    // Helper to get the cached config
    private getConfig = (): Effect.Effect<
        // Use standard Readonly<Record<...>> type
        { providers: Readonly<Record<string, ProviderConfig>>; defaultProviderName: string },
        ProviderConfigurationError
    > => loadAndCacheProvidersConfig;

    getDefaultProviderName = (): Effect.Effect<string, ProviderConfigurationError> =>
        this.getConfig().pipe(Effect.map((config) => config.defaultProviderName));

    getProviderConfigByName = (
        name: string
    ): Effect.Effect<ProviderConfig, ProviderConfigurationError> =>
        this.getConfig().pipe(
            Effect.flatMap((config) =>
                // Use Record.get function for safe access (returns Option)
                Record.get(config.providers, name).pipe( // <--- Use Record.get
                    Effect.mapError(() => new ProviderConfigurationError({ // Should not happen if key exists, but good practice
                        message: `Error accessing provider config for name: ${name}`,
                        context: { providerName: name },
                    })),
                    // Handle Option using Effect.if or Option.match
                    Effect.flatMap(Effect.if({
                        onFalse: Effect.fail(new ProviderConfigurationError({
                            message: `Provider configuration not found for name: ${name}`,
                            context: { providerName: name },
                        })),
                        onTrue: Effect.succeed // Type is Effect<ProviderConfig, never> here
                    }))
                )
            )
        );

    resolveModelId = (
        modelId: string
    ): Effect.Effect<{ providerConfig: ProviderConfig; resolvedModelName: string }, ProviderError> => {
        // Capture 'this' context for use inside Effect.gen
        const getConfig = this.getConfig;
        const getProviderConfigByName = this.getProviderConfigByName; // Capture method

        return Effect.gen(function* () {
            const config = yield* getConfig(); // Use captured method
            let providerName: string | undefined;
            let modelNamePart: string | undefined;

            if (modelId.includes("/")) {
                const parts = modelId.split("/", 2);
                providerName = parts[0];
                modelNamePart = parts[1];
            } else {
                providerName = config.defaultProviderName;
                modelNamePart = modelId;
            }

            if (!providerName || !modelNamePart) {
                return yield* Effect.fail(new ModelNotFoundError({
                    provider: providerName ?? "unknown", modelId: modelId,
                    message: `Could not parse provider/model from modelId: ${modelId}`,
                }));
            }

            // Use captured method
            const providerConfig = yield* getProviderConfigByName(providerName).pipe(
                Effect.mapError((e) => new ModelNotFoundError({
                    provider: providerName!, modelId: modelId,
                    message: `Provider configuration not found for '${providerName}' while resolving modelId '${modelId}'.`,
                    cause: e
                }))
            );

            return { providerConfig: providerConfig, resolvedModelName: modelNamePart };
        });
    }
}

// --- Layer Definition ---

/** Live Layer for the ProviderConfiguration service. Requires ConfigLoader. */
export const ProviderConfigurationLiveLayer = Layer.succeed(
    ProviderConfiguration,
    new ProviderConfigurationLive()
);
// NOTE: This layer still implicitly requires ConfigLoaderApi.
// It needs to be provided when composing the final application layer.
// Example: Layer.provide(ProviderConfigurationLiveLayer, ConfigLoaderLiveLayer)


// --- Temporary Placeholder for ConfigLoaderApi ---
// Remove this once core/configuration is implemented
interface ConfigLoaderApi { readonly loadConfig: (filename: string, opts: any) => Effect.Effect<any, any> }
const ConfigLoaderApi = Context.GenericTag<ConfigLoaderApi>("ConfigLoader");
// --- End Placeholder ---
