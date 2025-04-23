/**
 * @file Defines the ProviderService for loading, validating, and accessing AI provider configurations and clients.
 * @module services/ai/provider/service
 */

import { EntityParseError } from "@/services/core/errors.js";
import { Config, ConfigProvider, Effect, Layer, Option, Ref, Schema as S } from "effect";
import { ProviderClient, ProviderClientApi } from "./client.js";
import { ProviderConfigError, ProviderNotFoundError, ProviderOperationError } from "./errors.js";
import { AnthropicProviderClientLayer } from "./implementations/anthropic.js";
import { DeepseekProviderClientLayer } from "./implementations/deepseek.js";
import { GoogleProviderClientLayer } from "./implementations/google.js";
import { GroqProviderClientLayer } from "./implementations/groq.js";
import { OpenAIProviderClientLayer } from "./implementations/openai.js";
import { OpenRouterProviderClientLayer } from "./implementations/openrouter.js";
import { PerplexityProviderClientLayer } from "./implementations/perplexity.js";
import { xAiProviderClientLayerAi } from "./implementations/xai.js";
import { ProviderFile, ProvidersType } from "./schema.js";

// --- Service Type Definition ---
export interface ProviderServiceApi {
    readonly load: () => Effect.Effect<ProviderFile, ProviderConfigError>;
    readonly getProviderClient: (providerName: ProvidersType) => Effect.Effect<ProviderClientApi, ProviderConfigError | ProviderNotFoundError | ProviderOperationError>;
}

/**
 * ProviderService is an Effect service for managing AI provider configuration and clients.
 * Using ProviderServiceType interface for definition.
 */
export class ProviderService extends Effect.Service<ProviderServiceApi>()("ProviderService", {
    /**
     * Original nested effect structure.
     */
    effect: Effect.gen(function* () {
        let providerRef: Ref.Ref<Option.Option<ProviderFile>>;

        return {
            load: () => {
                return Effect.gen(function* () {
                    const configProvider = yield* ConfigProvider.ConfigProvider;
                    const rawConfig = yield* configProvider.load(Config.string("provider")).pipe(
                        Effect.mapError(cause => new ProviderConfigError({
                            message: "Failed to load provider config",
                            cause: new EntityParseError({
                                filePath: "providers.json",
                                cause
                            })
                        }))
                    );

                    const parsedConfig = yield* Effect.try({
                        try: () => JSON.parse(rawConfig),
                        catch: (error) => new ProviderConfigError({
                            message: "Failed to parse provider config",
                            cause: new EntityParseError({
                                filePath: "providers.json",
                                cause: error instanceof Error ? error : new Error(String(error))
                            })
                        })
                    });

                    const validConfig = yield* S.decode(ProviderFile)(parsedConfig).pipe(
                        Effect.mapError(cause => new ProviderConfigError({
                            message: "Failed to validate provider config",
                            cause: new EntityParseError({
                                filePath: "providers.json",
                                cause
                            })
                        }))
                    );

                    providerRef = yield* Ref.make<Option.Option<ProviderFile>>(Option.some(validConfig));
                    return validConfig;
                });
            },

            getProviderClient: (providerName: ProvidersType): Effect.Effect<ProviderClientApi, ProviderConfigError | ProviderNotFoundError | ProviderOperationError> => {
                const providerLayerMap: Record<ProvidersType, Layer.Layer<ProviderClientApi, never, never>> = {
                    openai: OpenAIProviderClientLayer,
                    anthropic: AnthropicProviderClientLayer,
                    google: GoogleProviderClientLayer,
                    deepseek: DeepseekProviderClientLayer,
                    xai: xAiProviderClientLayerAi,
                    perplexity: PerplexityProviderClientLayer,
                    groq: GroqProviderClientLayer,
                    openrouter: OpenRouterProviderClientLayer
                };

                return Effect.gen(function* () {
                    // Check if provider exists in config
                    const providerConfig = yield* providerRef.get.pipe(
                        Effect.flatMap(optConfig =>
                            Option.match(optConfig, {
                                onNone: () => Effect.fail(new ProviderConfigError({
                                    message: "Provider config not loaded. Call load() first."
                                })),
                                onSome: (config) => Effect.succeed(config)
                            })
                        )
                    );

                    const provider = providerConfig.providers.find(p => p.name === providerName);
                    if (!provider) {
                        return yield* Effect.fail(new ProviderNotFoundError(providerName));
                    }

                    const layer = providerLayerMap[providerName];
                    if (!layer) {
                        return yield* Effect.fail(new ProviderOperationError({
                            providerName,
                            operation: "getProviderClient",
                            message: `No ProviderClient layer found for provider: ${providerName}`
                        }));
                    }

                    return yield* ProviderClient.pipe(
                        Effect.provide(layer),
                        Effect.scoped,
                        Effect.catchAll((error: unknown) => Effect.fail(new ProviderOperationError({
                            providerName,
                            operation: "getProviderClient",
                            message: "Failed to initialize provider client",
                            cause: error instanceof Error ? error : new Error(String(error))
                        })))
                    );
                })
            }
        };
    })
}) { }