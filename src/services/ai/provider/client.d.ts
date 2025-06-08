/**
 * @file Provider client service implementation
 * @module services/ai/provider/client
 */
/// <reference types="node" />
import { Effect } from "effect";
import { EffectiveInput } from "@/types.js";
import { ProviderClientApi } from "./api.js";
import { ProviderServiceConfigError } from "./errors.js";
import type { EffectiveProviderApi, ProviderChatOptions, ProviderGenerateEmbeddingsOptions, ProviderGenerateObjectOptions, ProviderGenerateSpeechOptions, ProviderGenerateTextOptions, ProviderTranscribeOptions } from "./types.js";
declare const ProviderClient_base: Effect.Service.Class<ProviderClientApi, "ProviderClient", {
    readonly effect: Effect.Effect<{
        setVercelProvider: (vercelProvider?: EffectiveProviderApi) => Effect.Effect<undefined, ProviderServiceConfigError, never>;
        getProvider: () => Effect.Effect<EffectiveProviderApi, ProviderServiceConfigError, never>;
        getDefaultModelIdForProvider: (providerName: string) => Effect.Effect<string, import("@/services/ai/index.js").ModelNotFoundError, never>;
        getCapabilities: () => Effect.Effect<Set<import("./types.js").ModelCapability>, ProviderServiceConfigError, never>;
        chat: (input: EffectiveInput, options: ProviderChatOptions) => Effect.Effect<import("@/types.js").EffectiveResponse<import("./types.js").GenerateTextResult>, ProviderServiceConfigError | import("./errors.js").ProviderMissingCapabilityError | import("./errors.js").ProviderOperationError, import("@/services/ai/index.js").ModelServiceApi>;
        generateText: (input: EffectiveInput, options: ProviderGenerateTextOptions) => Effect.Effect<import("@/types.js").EffectiveResponse<import("./types.js").GenerateTextResult>, ProviderServiceConfigError | import("./errors.js").ProviderMissingCapabilityError | import("./errors.js").ProviderOperationError, import("@/services/ai/index.js").ModelServiceApi>;
        generateObject: <T = unknown>(input: EffectiveInput, options: ProviderGenerateObjectOptions<T>) => Effect.Effect<import("@/types.js").EffectiveResponse<import("./types.js").GenerateObjectResult<unknown>>, ProviderServiceConfigError | import("./errors.js").ProviderMissingCapabilityError | import("./errors.js").ProviderOperationError, import("@/services/ai/index.js").ModelServiceApi>;
        generateSpeech: (input: string, options: ProviderGenerateSpeechOptions) => Effect.Effect<import("@/types.js").EffectiveResponse<import("./types.js").GenerateSpeechResult>, ProviderServiceConfigError | import("./errors.js").ProviderMissingCapabilityError | import("./errors.js").ProviderOperationError, import("@/services/ai/index.js").ModelServiceApi>;
        transcribe: (input: Buffer, options: ProviderTranscribeOptions) => Effect.Effect<import("@/types.js").EffectiveResponse<import("./types.js").TranscribeResult>, ProviderServiceConfigError | import("./errors.js").ProviderMissingCapabilityError | import("./errors.js").ProviderOperationError, import("@/services/ai/index.js").ModelServiceApi>;
        generateEmbeddings: (input: string[], options: ProviderGenerateEmbeddingsOptions) => Effect.Effect<import("@/types.js").EffectiveResponse<import("./types.js").GenerateEmbeddingsResult>, ProviderServiceConfigError | import("./errors.js").ProviderMissingCapabilityError | import("./errors.js").ProviderOperationError, import("@/services/ai/index.js").ModelServiceApi>;
        getModels: () => Effect.Effect<import("ai").LanguageModelV1[], ProviderServiceConfigError, import("@/services/ai/index.js").ModelServiceApi>;
        validateToolInputs: (toolName: string, input: unknown) => Effect.Effect<unknown, import("./errors.js").ProviderToolError, never>;
    }, never, import("@/services/ai/index.js").ModelServiceApi>;
}>;
export declare class ProviderClient extends ProviderClient_base {
}
export {};
//# sourceMappingURL=client.d.ts.map