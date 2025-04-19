/**
 * @file Defines the ProviderService for loading, validating, and accessing AI provider configurations and clients.
 * @module services/ai/provider/service
 */

import { EntityParseError } from "@/services/core/errors.js";
import { Config, ConfigProvider, Context, Effect, Option, Ref, Schema as S } from "effect";
import { ProviderClient, ProviderClientApi } from "./client.js";
import { ProviderConfigError } from "./errors.js";
import { AnthropicProviderClientLayer } from "./implementations/anthropic.js";
import { DeepseekProviderClientLayer } from "./implementations/deepseek.js";
import { GoogleProviderClientLayer } from "./implementations/google.js";
import { OpenAIProviderClientLayer } from "./implementations/openai.js";
import { xAiProviderClientLayerAi } from "./implementations/xai.js";
import { ProviderFile, ProvidersType } from "./schema.js";

// --- Service Type Definition ---
export interface ProviderServiceType {
    readonly load: () => Effect.Effect<ProviderFile, ProviderConfigError, ConfigProvider.ConfigProvider>;
    readonly getProviderClient: (providerName: ProvidersType) => Effect.Effect<ProviderClientApi, ProviderConfigError, never>;
}

/**
 * ProviderService is an Effect service for managing AI provider configuration and clients.
 * Using ProviderServiceType interface for definition.
 */
export class ProviderService extends Effect.Service<ProviderServiceType>()("ProviderService", {
    /**
     * Original nested effect structure.
     */
    effect: Effect.gen(function* () {
        // Original Ref declarations (still potentially problematic for caching here)
        let providerRef = yield* Ref.make<Option.Option<ProviderFile>>(Option.none());
        let providerClientRef = yield* Ref.make<Option.Option<ProviderClientApi>>(Option.none());

        // Return the implementation matching ProviderServiceType
        return {
            load: (): Effect.Effect<ProviderFile, ProviderConfigError, ConfigProvider.ConfigProvider> => {
                // Original structure without explicit caching logic shown
                return Effect.gen(function* () {
                    const configProvider = yield* ConfigProvider.ConfigProvider;
                    const rawConfig = yield* configProvider.load(Config.string("provider")).pipe(
                        Effect.mapError(cause => new ProviderConfigError({
                            message: "Failed to load model config",
                            cause: new EntityParseError({ filePath: "models.json", cause })
                        }))
                    );

                    // Use Effect.try correctly: catch returns the mapped error
                    const parsedData = yield* Effect.try({
                        try: () => JSON.parse(rawConfig),
                        catch: (error) => new ProviderConfigError({ // Return error here
                            message: "Failed to parse model config",
                            cause: new EntityParseError({
                                filePath: "models.json",
                                cause: error instanceof Error ? error : new Error(String(error)) // Ensure cause is Error
                            })
                        })
                    });

                    // Decode the parsed data directly
                    const validConfig = yield* S.decode(ProviderFile)(parsedData).pipe(
                        Effect.mapError(cause => new ProviderConfigError({
                            message: "Failed to validate model config",
                            cause: new EntityParseError({ filePath: "models.json", cause })
                        }))
                    );

                    // Original: Did not explicitly use/set Ref here
                    // yield* Ref.set(providerRef, Option.some(validConfig));

                    return validConfig;
                });
            },
            getProviderClient: (providerName: ProvidersType): Effect.Effect<ProviderClientApi, ProviderConfigError, never> => {
                const providerLayerMap: Record<string, any> = {
                    openai: OpenAIProviderClientLayer,
                    anthropic: AnthropicProviderClientLayer,
                    google: GoogleProviderClientLayer,
                    deepseek: DeepseekProviderClientLayer,
                    xai: xAiProviderClientLayerAi,
                };
                // Define the inner effect generation
                const effectGen = Effect.gen(function* () {
                    const layer = providerLayerMap[providerName];
                    if (!layer) {
                        return yield* Effect.fail(new ProviderConfigError({
                            message: `No ProviderClient layer found for provider: ${providerName}`
                        }));
                    }
                    const providerClient = yield* ProviderClient.pipe(Effect.provide(layer));
                    return providerClient;
                });

                // Pipe mapError to ensure the correct error type
                return effectGen.pipe(
                    Effect.mapError((error): ProviderConfigError => {
                        if (error instanceof ProviderConfigError) {
                            return error;
                        }
                        // Defensively handle other potential errors
                        return new ProviderConfigError({
                            message: "Unexpected error retrieving provider client",
                            cause: error instanceof Error ? error : new Error(String(error))
                        });
                    }),
                    // Explicitly provide empty context to satisfy R = never
                    Effect.provide(Context.empty())
                ) as Effect.Effect<ProviderClientApi, ProviderConfigError, never>;
            }
        } satisfies ProviderServiceType;
    })
}) { }