/**
 * @file Provider client service implementation
 * @module services/ai/provider/client
 */
import { Effect, Option, Ref } from "effect";
import { validateCapabilities, validateModelId } from "./utils.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderServiceConfigError } from "./errors.js";
export class ProviderClient extends Effect.Service()("ProviderClient", {
    effect: Effect.gen(function* () {
        const modelService = yield* ModelService;
        const providerRef = yield* Ref.make(Option.none());
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
            setVercelProvider: (vercelProvider) => Effect.gen(function* () {
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
            getDefaultModelIdForProvider: (providerName) => Effect.gen(function* () {
                const defaultModelId = yield* modelService.getDefaultModelId();
                return defaultModelId;
            }),
            getCapabilities: () => Effect.gen(function* () {
                const currentProvider = yield* getProviderHelper();
                return currentProvider.capabilities;
            }),
            chat: (input, options) => Effect.gen(function* () {
                const currentProvider = yield* getProviderHelper();
                const modelId = yield* validateModelId({ options, method: "chat" });
                yield* validateCapabilities({ providerName: currentProvider.name, required: "chat", actual: currentProvider.capabilities, method: "chat" });
                return yield* currentProvider.provider.chat({ text: input.text, messages: input.messages }, { ...options, modelId, toolService: options.toolService, tools: options.tools });
            }),
            generateText: (input, options) => Effect.gen(function* () {
                const currentProvider = yield* getProviderHelper();
                const modelId = yield* validateModelId({ options, method: "generateText" });
                yield* validateCapabilities({ providerName: currentProvider.name, required: "text-generation", actual: currentProvider.capabilities, method: "generateText" });
                return yield* currentProvider.provider.generateText(input, { ...options, modelId });
            }),
            generateObject: (input, options) => Effect.gen(function* () {
                const currentProvider = yield* getProviderHelper();
                const modelId = yield* validateModelId({ options, method: "generateObject" });
                yield* validateCapabilities({ providerName: currentProvider.name, required: "generate-object", actual: currentProvider.capabilities, method: "generateObject" });
                return yield* currentProvider.provider.generateObject(input, { ...options, modelId });
            }),
            generateSpeech: (input, options) => Effect.gen(function* () {
                const currentProvider = yield* getProviderHelper();
                const modelId = yield* validateModelId({ options, method: "generateSpeech" });
                yield* validateCapabilities({ providerName: currentProvider.name, required: "audio", actual: currentProvider.capabilities, method: "generateSpeech" });
                return yield* currentProvider.provider.generateSpeech(input, { ...options, modelId });
            }),
            transcribe: (input, options) => Effect.gen(function* () {
                const currentProvider = yield* getProviderHelper();
                const modelId = yield* validateModelId({ options, method: "transcribe" });
                yield* validateCapabilities({ providerName: currentProvider.name, required: "audio", actual: currentProvider.capabilities, method: "transcribe" });
                // Convert Buffer to ArrayBuffer using a new ArrayBuffer copy
                const arrayBuffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
                const copy = new ArrayBuffer(arrayBuffer.byteLength);
                new Uint8Array(copy).set(new Uint8Array(arrayBuffer));
                return yield* currentProvider.provider.transcribe(copy, { ...options, modelId });
            }),
            generateEmbeddings: (input, options) => Effect.gen(function* () {
                const currentProvider = yield* getProviderHelper();
                const modelId = yield* validateModelId({ options, method: "generateEmbeddings" });
                yield* validateCapabilities({ providerName: currentProvider.name, required: "embeddings", actual: currentProvider.capabilities, method: "generateEmbeddings" });
                return yield* currentProvider.provider.generateEmbeddings(input, { ...options, modelId });
            }),
            getModels: () => Effect.gen(function* () {
                const currentProvider = yield* getProviderHelper();
                return yield* currentProvider.provider.getModels();
            }),
            validateToolInputs: (toolName, input) => Effect.gen(function* () {
                const currentProvider = yield* getProviderHelper();
                yield* validateCapabilities({ providerName: currentProvider.name, required: "tool-use", actual: currentProvider.capabilities, method: "validateToolInputs" });
                return yield* currentProvider.provider.validateToolInput(toolName, input);
            }),
        };
    })
}) {
}
//# sourceMappingURL=client.js.map