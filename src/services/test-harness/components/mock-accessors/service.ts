import { Effect } from "effect";
import type { LanguageModelV1 } from "@ai-sdk/provider";
import type { ModelServiceApi } from "@/services/ai/model/api.js";
import type { ProviderServiceApi } from "@/services/ai/provider/api.js";
import { MockAccessorApi } from "./api.js";

/**
 * Implementation of the MockAccessorService using Effect.Service pattern.
 * Provides access to standard mock objects for testing AI components.
 */
export class MockAccessorService extends Effect.Service<MockAccessorApi>()(
  "MockAccessorService",
  {
    effect: Effect.succeed({
      /**
       * Provides access to a pre-configured mock LanguageModelV1 instance.
       * This mock can be used for testing components that interact directly
       * with the AI SDK's language model interface.
       */
      mockLanguageModelV1: {
        specificationVersion: 'v1',
        provider: 'mock-provider',
        modelId: 'mock-model',
        defaultObjectGenerationMode: 'json',
        doGenerate: async (options: any) => ({
          text: "This is a mock response from the language model",
          finishReason: "stop",
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
          rawCall: { rawPrompt: options.messages?.[0]?.content || "", rawSettings: {} }
        }),
        doStream: async () => ({
          stream: new ReadableStream(),
          rawCall: { rawPrompt: "", rawSettings: {} }
        })
      } as unknown as LanguageModelV1,

      /**
       * Provides access to the mock ModelService instance used by the harness.
       * Useful for asserting interactions or configuring the mock model service behavior.
       */
      mockModelService: {
        load: () => Effect.succeed({ models: [], name: "mock", version: "1.0" }),
        getProviderName: () => Effect.succeed("mock-provider"),
        findModelsByCapability: () => Effect.succeed([]),
        findModelsByCapabilities: () => Effect.succeed([]),
        getDefaultModelId: () => Effect.succeed("mock-model"),
        getModelsForProvider: () => Effect.succeed([]),
        validateModel: () => Effect.succeed(true)
      } as unknown as ModelServiceApi,

      /**
       * Provides access to the mock ProviderService instance used by the harness.
       * Useful for asserting interactions or configuring the mock provider service behavior.
       */
      mockProviderService: {
        load: Effect.succeed({ providers: [], name: "mock", description: "Mock provider file" }),
        getProviderClient: () => Effect.succeed({
          chat: () => Effect.succeed({}),
          setVercelProvider: () => Effect.succeed(undefined),
          getProvider: () => Effect.succeed({
            name: "mock-provider",
            provider: "mock",
            capabilities: ["text-generation"]
          }),
          generateText: () => Effect.succeed({
            data: { text: "This is a mock text response" },
            metadata: {}
          }),
          generateObject: () => Effect.succeed({ data: {}, metadata: {} }),
          generateSpeech: () => Effect.succeed({ data: {}, metadata: {} }),
          transcribe: () => Effect.succeed({ data: {}, metadata: {} }),
          generateEmbeddings: () => Effect.succeed({ data: {}, metadata: {} }),
          generateImage: () => Effect.succeed({ data: {}, metadata: {} }),
          getCapabilities: () => Effect.succeed(new Set()),
          getModels: () => Effect.succeed([])
        })
      } as unknown as ProviderServiceApi
    }),
    dependencies: [],
  }
) {}

export default MockAccessorService;
