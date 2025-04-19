/**
 * @file Provides the Effect Layer for the xAI provider client implementation.
 * @module services/ai/provider/implementations/xai
 */
import { Effect, Layer } from "effect";
import { ProviderClient, createProvider } from "../client.js";
import { ProviderNotFoundError } from "../errors.js";
import { ProvidersType } from "../schema.js";

/**
 * xAiProviderClientLayerAi is an Effect Layer that provides a ProviderClient implementation for the xAI provider.
 *
 * - Overrides setVercelProvider to initialize the xAI client when the provider is 'xai'.
 * - Delegates all other ProviderClientApi methods to the default implementation.
 */
export const xAiProviderClientLayerAi = Layer.effect(
    ProviderClient,
    Effect.gen(function* () {
        // Get the default ProviderClient implementation from the environment
        const defaultClient = yield* ProviderClient;
        // Return a new implementation that overrides setVercelProvider only
        return {
            setVercelProvider: (provider: ProvidersType, apiKeyEnvVar: string) => {
                return Effect.gen(function* () {
                    if (provider === "xai") {
                        const xaiProvider = yield* createProvider(provider, apiKeyEnvVar);
                        return xaiProvider;
                    } else {
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