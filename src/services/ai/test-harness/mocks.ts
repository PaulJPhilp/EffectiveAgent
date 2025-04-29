/**
 * @file Mock implementations for test harness
 */

import { Effect } from "effect";
import type { ProviderTextGenerationResult } from "@/services/ai/producers/text/service.js";
import type { ModelCapability } from "@/services/ai/provider/types.js";
import type { LanguageModelV1, LanguageModelV1CallOptions } from "ai";

/**
 * Creates a mock LanguageModelV1 instance for testing
 */
export const mockLanguageModel: LanguageModelV1 = {

  specificationVersion: 'v1',
  provider: 'test-provider',
  modelId: 'test-model-id',
  defaultObjectGenerationMode: 'json',
  doGenerate: async (input: string, options: { modelId: string }) => ({
    text: "mocked response",
    finishReason: "stop",
    usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    rawCall: { rawPrompt: "", rawSettings: {} }
  }),
  doStream: async () => ({
    stream: new ReadableStream(),
    rawCall: { rawPrompt: "", rawSettings: {} }
  })
};

/**
 * Creates a mock provider service for testing
 */
export const createMockProviderService = () => ({
  validateModel: (_modelId: string, _capabilities: ModelCapability[]): Effect.Effect<void> =>
    Effect.succeed(undefined),
    
  load: (): Effect.Effect<void> => 
    Effect.succeed(undefined),

  getProviderClient: () => Effect.succeed({
    generateText: (_input: EffectiveInput, _options: { modelId: string }) => Effect.succeed({
      data: {
        text: "mocked text",
      },
      metadata: {
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        finishReason: "stop",
        model: "test-model",
        timestamp: new Date(),
        id: "test-id"
      }
    } satisfies ProviderTextGenerationResult),

    getModels: () => Effect.succeed([mockLanguageModel]),
    getCapabilities: () => Effect.succeed(new Set(["text-generation" as const]))
  })
});
