/**
 * @file Provides the Effect Layer for the OpenAI provider client implementation.
 * @module services/ai/provider/implementations/openai
 */

import { Effect, Layer } from "effect";
import { ProviderClient, createProvider } from "../client.js";
import { ProviderNotFoundError } from "../errors.js";
import { ProvidersType } from "../schema.js";

/**
 * OpenAIProviderClientLayer is an Effect Layer that provides a ProviderClient implementation for the OpenAI provider.
 *
 * - Overrides setVercelProvider to initialize the OpenAI client when the provider is 'openai'.
 * - Delegates all other ProviderClientApi methods to the default implementation.
 */
export const OpenAIProviderClientLayer = Layer.effect(
    ProviderClient,
    Effect.gen(function* () {
        // Get the default ProviderClient implementation from the environment
        const defaultClient = yield* ProviderClient;
        // Return a new implementation that overrides setVercelProvider only
        return {
            setVercelProvider: (provider: ProvidersType, apiKeyEnvVar: string) => {
                return Effect.gen(function* () {
                    if (provider === "openai") {
                        const openaiProvider = yield* createProvider(provider, apiKeyEnvVar);
                        return openaiProvider;
                    } else {
                        // Explicitly return never to satisfy the type system
                        return yield* Effect.fail(new ProviderNotFoundError("Provider not found"));
                    }
                });
            },
            // Delegate all other methods to the default implementation
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