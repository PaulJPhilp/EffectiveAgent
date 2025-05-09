/**
 * @file Provider client service implementation
 * @module services/ai/provider/client
 */

import { Context, Effect, Option, Ref } from "effect"; 
import { validateCapabilities, validateModelId } from "./helpers.js";

import { ModelCapability } from "@/schema.js";
import { ModelService } from "@/services/ai/model/service.js";
import { EffectiveInput } from "@/types.js";
import { ProviderClientApi } from "./api.js";

import {
  ProviderConfigError,
  ProviderMissingCapabilityError,
  ProviderOperationError,
  ProviderToolError
} from "./errors.js";
import type {
  EffectiveProviderApi,
  EffectiveResponse,
  GenerateEmbeddingsResult,
  GenerateObjectResult,
  GenerateSpeechResult,
  GenerateTextResult,
  ProviderChatOptions,
  ProviderGenerateEmbeddingsOptions,
  ProviderGenerateObjectOptions,
  ProviderGenerateSpeechOptions,
  ProviderGenerateTextOptions,
  ProviderTranscribeOptions,
  ProvidersType,
  ToolDefinition,
  TranscribeResult
} from "./types.js";

export class ProviderClient extends Effect.Service<ProviderClientApi>()(
  "ProviderClient",
  {
    effect: Effect.gen(function*() {
      const modelService = yield* ModelService; 
      const providerRef = yield* Ref.make(Option.none<EffectiveProviderApi>());

      const getProviderHelper = () => Effect.gen(function*() {
        const option = yield* Ref.get(providerRef);
        if (Option.isNone(option)) {
          return yield* Effect.fail(new ProviderConfigError({
            description: "Provider not set. Call setVercelProvider first.",
            module: "ProviderClient",
            method: "getProvider"
          }));
        }
        return option.value;
      });

      return {
        setVercelProvider: (vercelProvider?: EffectiveProviderApi) =>
          Effect.gen(function*() {
            if (!vercelProvider) {
              return yield* Effect.fail(new ProviderConfigError({
                description: "Invalid provider config: provider is undefined",
                module: "ProviderClient",
                method: "setVercelProvider"
              }));
            }
            yield* Ref.set(providerRef, Option.some(vercelProvider));
          }),

        getProvider: getProviderHelper,

        getDefaultModelIdForProvider: (providerName: ProvidersType, capability: ModelCapability) =>
          Effect.gen(function*() {
            const defaultModelId = yield* modelService.getDefaultModelId(providerName, capability);
            return defaultModelId;
          }),

        getCapabilities: () => Effect.gen(function*() {
          const currentProvider = yield* getProviderHelper();
          return currentProvider.capabilities;
        }),

        chat: (input: EffectiveInput, options: ProviderChatOptions) => Effect.gen(function*() {
          const currentProvider = yield* getProviderHelper();
          const modelId = yield* validateModelId({ options, method: "chat" });
          yield* validateCapabilities({ providerName: currentProvider.name, required: "chat", actual: currentProvider.capabilities, method: "chat" });
          return yield* currentProvider.provider.chat(input, { ...options, modelId, toolService: options.toolService, tools: options.tools });
        }),

        generateText: (input: EffectiveInput, options: ProviderGenerateTextOptions) => Effect.gen(function*() {
          const currentProvider = yield* getProviderHelper();
          const modelId = yield* validateModelId({ options, method: "generateText" });
          yield* validateCapabilities({ providerName: currentProvider.name, required: "text-generation", actual: currentProvider.capabilities, method: "generateText" });
          return yield* currentProvider.provider.generateText(input, { ...options, modelId });
        }),

        generateObject: <T = unknown>(input: EffectiveInput, options: ProviderGenerateObjectOptions<T>) => Effect.gen(function*() {
          const currentProvider = yield* getProviderHelper();
          const modelId = yield* validateModelId({ options, method: "generateObject" });
          yield* validateCapabilities({ providerName: currentProvider.name, required: "generate-object" as ModelCapability, actual: currentProvider.capabilities, method: "generateObject" });
          return yield* currentProvider.provider.generateObject(input, { ...options, modelId });
        }),

        generateSpeech: (input: string, options: ProviderGenerateSpeechOptions) => Effect.gen(function*() {
          const currentProvider = yield* getProviderHelper();
          const modelId = yield* validateModelId({ options, method: "generateSpeech" });
          yield* validateCapabilities({ providerName: currentProvider.name, required: "audio", actual: currentProvider.capabilities, method: "generateSpeech" });
          return yield* currentProvider.provider.generateSpeech(input, { ...options, modelId });
        }),

        transcribe: (input: ArrayBuffer, options: ProviderTranscribeOptions) => Effect.gen(function*() {
          const currentProvider = yield* getProviderHelper();
          const modelId = yield* validateModelId({ options, method: "transcribe" });
          yield* validateCapabilities({ providerName: currentProvider.name, required: "audio", actual: currentProvider.capabilities, method: "transcribe" });
          return yield* currentProvider.provider.transcribe(input, { ...options, modelId });
        }),

        generateEmbeddings: (input: string[], options: ProviderGenerateEmbeddingsOptions) => Effect.gen(function*() {
          const currentProvider = yield* getProviderHelper();
          const modelId = yield* validateModelId({ options, method: "generateEmbeddings" });
          yield* validateCapabilities({ providerName: currentProvider.name, required: "embeddings" as ModelCapability, actual: currentProvider.capabilities, method: "generateEmbeddings" });
          return yield* currentProvider.provider.generateEmbeddings(input, { ...options, modelId });
        }),

        getModels: () => Effect.gen(function*() {
          const currentProvider = yield* getProviderHelper();
          return yield* currentProvider.provider.getModels();
        }),
        
        validateToolInput: (toolName: string, toolInput: unknown) => Effect.gen(function*() {
          const currentProvider = yield* getProviderHelper();
          return yield* currentProvider.provider.validateToolInput(toolName, toolInput);
        }),

        executeTool: (toolName: string, toolInput: unknown) => Effect.gen(function*() {
          const currentProvider = yield* getProviderHelper();
          return yield* currentProvider.provider.executeTool(toolName, toolInput);
        }),

        processToolResult: (toolName: string, toolResult: unknown) => Effect.gen(function*() {
          const currentProvider = yield* getProviderHelper();
          return yield* currentProvider.provider.processToolResult(toolName, toolResult);
        }),
      };
    }),
    dependencies: [ModelService.Default] 
  }
) { }