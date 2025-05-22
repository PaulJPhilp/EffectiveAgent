/**
 * @file Provider client service implementation
 * @module services/ai/provider/client
 */

import { Effect, Option, Ref } from "effect";
import { validateCapabilities, validateModelId } from "./utils.js";

import { ModelCapability } from "@/schema.js";
import { ModelService } from "@/services/ai/model/service.js";
import { EffectiveInput } from "@/types.js";
import { ProviderClientApi } from "./api.js";

import {
  ProviderServiceConfigError
} from "./errors.js";
import type {
  EffectiveProviderApi,
  ProviderChatOptions,
  ProviderGenerateEmbeddingsOptions,
  ProviderGenerateObjectOptions,
  ProviderGenerateSpeechOptions,
  ProviderGenerateTextOptions,
  ProviderTranscribeOptions,
  ToolDefinition
} from "./types.js";

export class ProviderClient extends Effect.Service<ProviderClientApi>()(
  "ProviderClient",
  {
    effect: Effect.gen(function* () {
      const modelService = yield* ModelService;
      const providerRef = yield* Ref.make(Option.none<EffectiveProviderApi>());

      const getProviderHelper = () => Effect.gen(function* () {
        const option = yield* Ref.get(providerRef);
        if (Option.isNone(option)) {
          return yield* Effect.fail(new ProviderServiceConfigError({
            description: "Provider not set. Call setVercelProvider first.",
            module: "ProviderClient",
            method: "getProvider"
          }));
        }
        return option.value;
      });

      return {
        setVercelProvider: (vercelProvider?: EffectiveProviderApi) =>
          Effect.gen(function* () {
            if (!vercelProvider) {
              return yield* Effect.fail(new ProviderServiceConfigError({
                description: "Invalid provider config: provider is undefined",
                module: "ProviderClient",
                method: "setVercelProvider"
              }));
            }
            yield* Ref.set(providerRef, Option.some(vercelProvider));
          }),

        getProvider: getProviderHelper,

        getDefaultModelIdForProvider: (providerName: string) =>
          Effect.gen(function* () {
            const defaultModelId = yield* modelService.getDefaultModelId();
            return defaultModelId;
          }),

        getCapabilities: () => Effect.gen(function* () {
          const currentProvider = yield* getProviderHelper();
          return currentProvider.capabilities;
        }),

        chat: (input: any[], options: ProviderChatOptions) => Effect.gen(function* () {
          const currentProvider = yield* getProviderHelper();
          const modelId = yield* validateModelId({ options, method: "chat" });
          yield* validateCapabilities({ providerName: currentProvider.name, required: "chat", actual: currentProvider.capabilities, method: "chat" });
          return yield* currentProvider.provider.chat(input, { ...options, modelId, toolService: options.toolService, tools: options.tools });
        }),

        generateText: (input: EffectiveInput, options: ProviderGenerateTextOptions) => Effect.gen(function* () {
          const currentProvider = yield* getProviderHelper();
          const modelId = yield* validateModelId({ options, method: "generateText" });
          yield* validateCapabilities({ providerName: currentProvider.name, required: "text-generation", actual: currentProvider.capabilities, method: "generateText" });
          return yield* currentProvider.provider.generateText(input.toString(), { ...options, modelId });
        }),

        generateObject: <T = unknown>(input: EffectiveInput, options: ProviderGenerateObjectOptions<T>) => Effect.gen(function* () {
          const currentProvider = yield* getProviderHelper();
          const modelId = yield* validateModelId({ options, method: "generateObject" });
          yield* validateCapabilities({ providerName: currentProvider.name, required: "generate-object" as ModelCapability, actual: currentProvider.capabilities, method: "generateObject" });
          return yield* currentProvider.provider.generateObject(input.toString(), { ...options, modelId });
        }),

        generateSpeech: (input: string, options: ProviderGenerateSpeechOptions) => Effect.gen(function* () {
          const currentProvider = yield* getProviderHelper();
          const modelId = yield* validateModelId({ options, method: "generateSpeech" });
          yield* validateCapabilities({ providerName: currentProvider.name, required: "audio", actual: currentProvider.capabilities, method: "generateSpeech" });
          return yield* currentProvider.provider.generateSpeech(input, { ...options, modelId });
        }),

        transcribe: (input: Buffer, options: ProviderTranscribeOptions) => Effect.gen(function* () {
          const currentProvider = yield* getProviderHelper();
          const modelId = yield* validateModelId({ options, method: "transcribe" });
          yield* validateCapabilities({ providerName: currentProvider.name, required: "audio", actual: currentProvider.capabilities, method: "transcribe" });
          return yield* currentProvider.provider.transcribe(input, { ...options, modelId });
        }),

        generateEmbeddings: (input: string[], options: ProviderGenerateEmbeddingsOptions) => Effect.gen(function* () {
          const currentProvider = yield* getProviderHelper();
          const modelId = yield* validateModelId({ options, method: "generateEmbeddings" });
          yield* validateCapabilities({ providerName: currentProvider.name, required: "embeddings" as ModelCapability, actual: currentProvider.capabilities, method: "generateEmbeddings" });
          return yield* currentProvider.provider.generateEmbeddings(input, { ...options, modelId });
        }),

        getModels: () => Effect.gen(function* () {
          const currentProvider = yield* getProviderHelper();
          return yield* currentProvider.provider.getModels();
        }),

        validateToolInputs: (toolInput: unknown) => Effect.gen(function* () {
          const currentProvider = yield* getProviderHelper();
          yield* validateCapabilities({ providerName: currentProvider.name, required: "tool-use", actual: currentProvider.capabilities, method: "validateToolInputs" });
          return yield* currentProvider.provider.validateToolInputs(toolInput as ToolDefinition[]);
        }),
      };
    }),
    dependencies: [ModelService.Default]
  }
) { }