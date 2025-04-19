/**
 * @file Provides the Effect Layer for the Perplexity AI provider client implementation.
 * @module services/ai/provider/implementations/perplexity
 */

import { Effect, Layer } from "effect";
import { ProviderClient, createProvider } from "../client.js";
import { ProviderNotFoundError } from "../errors.js";
import { ProvidersType } from "../schema.js";

/**
 * PerplexityProviderClientLayer is an Effect Layer that provides a ProviderClient implementation for the Perplexity provider.
 *
 * - Overrides setVercelProvider to initialize the Perplexity client when the provider is 'perplexity'.
 * - Delegates all other ProviderClientApi methods to the default implementation.
 */
export const PerplexityProviderClientLayer = Layer.effect(
    ProviderClient,
    Effect.gen(function* () {
        const defaultClient = yield* ProviderClient;
        return {
            setVercelProvider: (provider: ProvidersType, apiKeyEnvVar: string) => {
                return Effect.gen(function* () {
                    if (provider === "perplexity") {
                        const perplexityProvider = yield* createProvider(provider, apiKeyEnvVar);
                        return perplexityProvider;
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
