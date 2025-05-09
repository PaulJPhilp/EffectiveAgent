import { Effect, Layer } from "effect";
import { ProviderClient } from "../client.js";
import { ProviderConfigError } from "../errors.js";
import type {
  EffectiveProviderApi,
  ProviderGenerateEmbeddingsOptions,
  ProviderGenerateObjectOptions,
  ProviderGenerateSpeechOptions,
  ProviderGenerateTextOptions,
  ProviderTranscribeOptions
} from "../types.js";

/**
 * Returns a ProviderClientApi instance pre-configured for DeepSeek.
 */
export const makeDeepseekProviderClient = Effect.gen(function* () {
  const provider = yield* ProviderClient;
  return {
    setVercelProvider: (vercelProvider: EffectiveProviderApi): Effect.Effect<void, ProviderConfigError> => {
      if (!vercelProvider || !vercelProvider.capabilities) {
        return Effect.fail(new ProviderConfigError({ description: "Invalid provider config", module: "deepseek-provider-client", method: "setVercelProvider" }));
      }
      return provider.setVercelProvider({
        name: "deepseek",
        provider,
        capabilities: vercelProvider.capabilities
      });
    },
    getProvider: (): Effect.Effect<EffectiveProviderApi, ProviderConfigError> =>
      provider.getProvider(),
    generateText: (
      input: EffectiveInput,
      options: ProviderGenerateTextOptions
    ) => provider.generateText(input, options),
    generateObject: <T>(
      input: EffectiveInput,
      options: ProviderGenerateObjectOptions<T>
    ) => provider.generateObject(input, options),
    generateSpeech: (
      input: string,
      options: ProviderGenerateSpeechOptions
    ) => provider.generateSpeech(input, options),
    transcribe: (
      input: ArrayBuffer,
      options: ProviderTranscribeOptions
    ) => provider.transcribe(input, options),
    generateEmbeddings: (
      input: string[],
      options: ProviderGenerateEmbeddingsOptions
    ) => provider.generateEmbeddings(input, options),
    getCapabilities: () => provider.getCapabilities(),
    getModels: () => provider.getModels(),
  };
});

export const DeepseekProviderClientLayer = Layer.effect(
  ProviderClient,
  Effect.gen(function* () {
    const provider = yield* ProviderClient;
    return {
      setVercelProvider: (
        vercelProvider: EffectiveProviderApi
      ): Effect.Effect<void, ProviderConfigError> =>
        provider.setVercelProvider({
          name: "deepseek",
          provider,
          capabilities: vercelProvider.capabilities
        }),
      getProvider: (): Effect.Effect<EffectiveProviderApi, ProviderConfigError> =>
        provider.getProvider(),
      generateText: (
        input: EffectiveInput,
        options: ProviderGenerateTextOptions
      ) => provider.generateText(input, options),
      generateObject: <T>(
        input: EffectiveInput,
        options: ProviderGenerateObjectOptions<T>
      ) => provider.generateObject(input, options),
      generateSpeech: (
        input: string,
        options: ProviderGenerateSpeechOptions
      ) => provider.generateSpeech(input, options),
      transcribe: (
        input: ArrayBuffer,
        options: ProviderTranscribeOptions
      ) => provider.transcribe(input, options),
      generateEmbeddings: (
        input: string[],
        options: ProviderGenerateEmbeddingsOptions
      ) => provider.generateEmbeddings(input, options),
      getCapabilities: () => provider.getCapabilities(),
      getModels: () => provider.getModels(),
    };
  })
);
