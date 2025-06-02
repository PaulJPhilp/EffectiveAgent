import { ModelCapability } from "@/schema.js";
import type { EffectiveInput, EffectiveResponse, FinishReason } from "@/types.js";
import { type LanguageModelV1, generateText } from "ai";
import { Effect } from "effect";
import type { ModelServiceApi } from "../../model/api.js";
import { ModelService } from "../../model/service.js";
import type { ProviderClientApi } from "../api.js";
import {
  ProviderMissingCapabilityError,
  ProviderMissingModelIdError,
  ProviderNotFoundError,
  ProviderOperationError,
  ProviderServiceConfigError,
  ProviderToolError
} from "../errors.js";
import { ProvidersType } from "../schema.js";
import type {
  EffectiveProviderApi,
  GenerateEmbeddingsResult,
  GenerateImageResult,
  GenerateObjectResult,
  GenerateSpeechResult,
  GenerateTextResult,
  ProviderChatOptions,
  ProviderGenerateEmbeddingsOptions,
  ProviderGenerateImageOptions,
  ProviderGenerateObjectOptions,
  ProviderGenerateSpeechOptions,
  ProviderGenerateTextOptions,
  ProviderTranscribeOptions,
  TranscribeResult
} from "../types.js";

type Message = { role: "system" | "user"; content: string };
type GenerateTextResponse = {
  text: string;
  response?: {
    id?: string;
    modelId?: string;
  };
  finishReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

// Internal factory for ProviderService only
function makeAnthropicClient(apiKey: string): Effect.Effect<ProviderClientApi, ProviderServiceConfigError | ProviderNotFoundError | ProviderOperationError> {
  return Effect.succeed({
    // Tool-related methods
    validateToolInput: (toolName: string, input: unknown) => 
      Effect.fail(new ProviderToolError({ 
        description: `Tool validation not implemented for ${toolName}`, 
        provider: "anthropic" 
      })),
      
    executeTool: (toolName: string, input: unknown) => 
      Effect.fail(new ProviderToolError({ 
        description: `Tool execution not implemented for ${toolName}`, 
        provider: "anthropic" 
      })),
      
    processToolResult: (toolName: string, result: unknown) => 
      Effect.fail(new ProviderToolError({ 
        description: `Tool result processing not implemented for ${toolName}`, 
        provider: "anthropic" 
      })),
    
    // Provider and capability methods
    getProvider: () => Effect.fail(new ProviderOperationError({ 
      providerName: "anthropic", 
      operation: "getProvider", 
      message: "Not implemented", 
      module: "anthropic", 
      method: "getProvider" 
    })),
    
    getCapabilities: () => 
      Effect.succeed(new Set<ModelCapability>(["chat", "text-generation"])),
    
    // Core generation methods
    generateText: (input: EffectiveInput, options: ProviderGenerateTextOptions) => 
      Effect.gen(function* () {
        const modelId = options.modelId;
        if (!modelId) {
          return yield* Effect.fail(new ProviderMissingModelIdError({
            providerName: "anthropic",
            capability: "text-generation",
            module: "anthropic",
            method: "generateText"
          }));
        }

        const messages: Message[] = [];
        if (options.system) {
          messages.push({ role: "system", content: options.system });
        }
        messages.push({ role: "user", content: input.text });

        const result = yield* Effect.tryPromise({
          try: () => generateText({
            messages,
            model: modelId as unknown as LanguageModelV1,
            temperature: options.parameters?.temperature,
            maxTokens: options.parameters?.maxTokens,
            topP: options.parameters?.topP,
            frequencyPenalty: options.parameters?.frequencyPenalty,
            presencePenalty: options.parameters?.presencePenalty
          }) as Promise<GenerateTextResponse>,
          catch: error => new ProviderOperationError({
            providerName: "anthropic",
            operation: "generateText",
            message: error instanceof Error ? error.message : "Unknown error",
            module: "anthropic",
            method: "generateText",
            cause: error
          })
        });

        const textResult: GenerateTextResult = {
          text: result.text || "",
          id: result.response?.id || `anthropic-text-${Date.now()}`,
          model: result.response?.modelId || modelId,
          timestamp: new Date(),
          finishReason: (result.finishReason || "stop") as FinishReason,
          usage: {
            promptTokens: result.usage?.promptTokens || 0,
            completionTokens: result.usage?.completionTokens || 0,
            totalTokens: result.usage?.totalTokens || 0
          }
        };

        return {
          data: textResult,
          metadata: {
            model: modelId,
            provider: "anthropic",
            requestId: result.response?.id || `anthropic-text-${Date.now()}`,
            messageCount: messages.length,
            hasSystemPrompt: !!options.system
          },
          usage: textResult.usage,
          finishReason: textResult.finishReason
        };
      }),
      
    generateObject: <T = unknown>(input: EffectiveInput, options: ProviderGenerateObjectOptions<T>) => 
      Effect.fail(new ProviderOperationError({ 
        providerName: "anthropic", 
        operation: "generateObject", 
        message: "Not implemented", 
        module: "anthropic", 
        method: "generateObject" 
      })),
      
    generateSpeech: (input: string, options: ProviderGenerateSpeechOptions) => 
      Effect.fail(new ProviderOperationError({ 
        providerName: "anthropic", 
        operation: "generateSpeech", 
        message: "Not implemented", 
        module: "anthropic", 
        method: "generateSpeech" 
      })),
      
    transcribe: (input: ArrayBuffer, options: ProviderTranscribeOptions) => 
      Effect.fail(new ProviderOperationError({ 
        providerName: "anthropic", 
        operation: "transcribe", 
        message: "Not implemented", 
        module: "anthropic", 
        method: "transcribe" 
      })),
      
    generateEmbeddings: (input: string[], options: ProviderGenerateEmbeddingsOptions) => 
      Effect.fail(new ProviderOperationError({ 
        providerName: "anthropic", 
        operation: "generateEmbeddings", 
        message: "Not implemented", 
        module: "anthropic", 
        method: "generateEmbeddings" 
      })),
      
    generateImage: (input: EffectiveInput, options: ProviderGenerateImageOptions) => 
      Effect.fail(new ProviderOperationError({ 
        providerName: "anthropic", 
        operation: "generateImage", 
        message: "Not implemented", 
        module: "anthropic", 
        method: "generateImage" 
      })),
      
    // Chat method
    chat: (effectiveInput: EffectiveInput, options: ProviderChatOptions) => 
      Effect.fail(new ProviderOperationError({ 
        providerName: "anthropic", 
        operation: "chat", 
        message: "Not implemented", 
        module: "anthropic", 
        method: "chat" 
      })),
      
    // Model management
    getModels: (): Effect.Effect<LanguageModelV1[], ProviderServiceConfigError, ModelServiceApi> =>
      Effect.gen(function* () {
        const modelService = yield* ModelService;
        const anthropicModels = yield* modelService.getModelsForProvider("anthropic");
        return [...anthropicModels] as LanguageModelV1[];
      }).pipe(
        Effect.mapError(error => new ProviderServiceConfigError({
          description: `Failed to get Anthropic models: ${String(error)}`,
          module: "anthropic",
          method: "getModels"
        }))
      ),
      
    getDefaultModelIdForProvider: (providerName: ProvidersType, capability: ModelCapability) => 
      Effect.fail(new ProviderMissingModelIdError({ 
        providerName, 
        capability, 
        module: "anthropic", 
        method: "getDefaultModelIdForProvider" 
      })),
      
    // Vercel provider integration
    setVercelProvider: (vercelProvider: EffectiveProviderApi) => 
      Effect.fail(new ProviderOperationError({ 
        providerName: "anthropic", 
        operation: "setVercelProvider", 
        message: "Not implemented", 
        module: "anthropic", 
        method: "setVercelProvider" 
      }))
  });
}

export { makeAnthropicClient };
