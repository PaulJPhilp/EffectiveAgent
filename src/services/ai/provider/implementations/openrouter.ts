/**
 * @file Provides the Effect Layer for the OpenRouter AI provider client implementation.
 * @module services/ai/provider/implementations/openrouter
 */

import { Effect, Layer } from "effect";
import { ProviderClient, createProvider } from "../client.js";
import { ProviderNotFoundError } from "../errors.js";
import { ProvidersType } from "../schema.js";

/**
 * OpenRouterProviderClientLayer is an Effect Layer that provides a ProviderClient implementation for the OpenRouter provider.
 *
 * - Overrides setVercelProvider to initialize the OpenRouter client when the provider is 'openrouter'.
 * - Delegates all other ProviderClientApi methods to the default implementation.
 */
export const OpenRouterProviderClientLayer = Layer.effect(
    ProviderClient,
    Effect.gen(function* () {
        const defaultClient = yield* ProviderClient;
        return {
            setVercelProvider: (provider: ProvidersType, apiKeyEnvVar: string) => {
                return Effect.gen(function* () {
                    if (provider === "openrouter") {
                        const openrouterProvider = yield* createProvider(provider, apiKeyEnvVar);
                        return openrouterProvider;
                    } else {
                        return yield* Effect.fail(new ProviderNotFoundError("Provider not found"));
                    }
                });
            },
            generateText: defaultClient.generateText,
            streamText: defaultClient.streamText,
            generateObject: defaultClient.generateObject,
            streamObject: defaultClient.streamObject,
            generateSpeech: defaultClient.generateSpeech,
            generateImage: defaultClient.generateImage,
            transcribe: defaultClient.transcribe,
            embedding: defaultClient.embedding,
        };
    })
);
