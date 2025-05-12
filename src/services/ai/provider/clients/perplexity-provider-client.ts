import { makeProvider } from "./make-provider.js";

/**
 * Returns a ProviderClientApi instance pre-configured for Perplexity AI.
 */
export const makePerplexityProviderClient = makeProvider("perplexity", [
  "chat", "text-generation", "function-calling"
]);

export default makePerplexityProviderClient;

const provider = makePerplexityProviderClient;

export const PerplexityProviderClient = {
  setVercelProvider: (vercelProvider: EffectiveProviderApi): Effect.Effect<void, ProviderConfigError> => {
    if (!vercelProvider || !vercelProvider.capabilities) {
      return Effect.fail(new ProviderConfigError({ description: "Invalid provider config", module: "perplexity-provider-client", method: "setVercelProvider" }));
    }
    return provider.setVercelProvider({
      name: "perplexity",
      provider: vercelProvider.provider,
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
  chat: (
    input: EffectiveInput,
    options: ProviderChatOptions
  ): Effect.Effect<
    EffectiveResponse<GenerateTextResult>,
    ProviderOperationError | ProviderConfigError | ProviderMissingCapabilityError
  > => provider.chat(input, options),
  generateImage: (
    input: EffectiveInput,
    options: ProviderGenerateImageOptions
  ): Effect.Effect<
    EffectiveResponse<GenerateImageResult>,
    ProviderOperationError | ProviderConfigError | ProviderMissingCapabilityError
  > => provider.generateImage(input, options),
  validateToolInput: (
    toolName: string,
    input: unknown
  ): Effect.Effect<unknown, ProviderToolError> =>
    provider.validateToolInput(toolName, input),
  executeTool: (
    toolName: string,
    input: unknown
  ): Effect.Effect<unknown, ProviderToolError> =>
    provider.executeTool(toolName, input),
  processToolResult: (
    toolName: string,
    result: unknown
  ): Effect.Effect<unknown, ProviderToolError> =>
    provider.processToolResult(toolName, result)
};
      EffectiveResponse<GenerateImageResult>,
      ProviderOperationError | ProviderConfigError | ProviderMissingCapabilityError
    > => provider.generateImage(input, options),
    validateToolInput: (
      toolName: string,
      input: unknown
    ): Effect.Effect<unknown, ProviderToolError> =>
      provider.validateToolInput(toolName, input),
    executeTool: (
      toolName: string,
      input: unknown
    ): Effect.Effect<unknown, ProviderToolError> =>
      provider.executeTool(toolName, input),
    processToolResult: (
      toolName: string,
      result: unknown
    ): Effect.Effect<unknown, ProviderToolError> =>
      provider.processToolResult(toolName, result)
  };
});

export const PerplexityProviderClientLayer = Layer.effect(
  ProviderClient,
  Effect.map(makePerplexityProviderClient, (client) => ({
    ...client,
    getDefaultModelIdForProvider: () => Effect.succeed("pplx-7b-online")
  }))
);
