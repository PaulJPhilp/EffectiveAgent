import type { EffectiveError } from "@/errors.js"
import type { ModelServiceApi } from "@/services/ai/model/api.js"
import type { ProviderServiceApi } from "@/services/ai/provider/api.js"
import type { ChatCompletionOptions } from "@/services/pipeline/producers/chat/service.js"
import type { EmbeddingServiceApi } from "@/services/pipeline/producers/embedding/api.js"
import type { ObjectServiceApi } from "@/services/pipeline/producers/object/api.js"
import type { TextServiceApi } from "@/services/pipeline/producers/text/api.js"
import type { EffectiveResponse } from "@/types.js"
import type { LanguageModelV1 } from "@ai-sdk/provider"
import type { Effect } from "effect";

/**
 * Represents the arguments captured by a specific mock service's methods.
 */
export interface CapturedServiceArgs {
  [methodName: string]: any; // or more specific types if known
}

/**
 * Structure for storing all captured arguments by various mock services.
 */
export interface CapturedArgs {
  modelService: CapturedServiceArgs;
  providerService: CapturedServiceArgs;
  providerClient: CapturedServiceArgs;
  // producerServices?: { [serviceName: string]: CapturedServiceArgs }; // Optional: if needed for producer services directly
}
import type { Span } from "effect/Tracer"

// Define interfaces for services that don't have API files
interface ImageServiceApi {
  generate: (options: {
    modelId?: string;
    prompt: string;
    negativePrompt?: string;
    system?: unknown;
    size?: string;
    quality?: string;
    style?: string;
    n?: number;
    span: Span;
  }) => Effect.Effect<any, any, any>;
}

interface TranscriptionServiceApi {
  transcribe: (options: {
    modelId?: string;
    audioData: string;
    language?: string;
    prompt?: string;
    span: Span;
  }) => Effect.Effect<any, any, any>;
}


interface ChatServiceApi {
  create: (options: ChatCompletionOptions) => Effect.Effect<EffectiveResponse<string>, EffectiveError>;
}

/**
 * Defines the API for accessing standard mock objects provided by the test harness.
 */
export interface MockAccessorApi {
  /**
   * Provides access to a pre-configured mock LanguageModelV1 instance.
   * This mock can be used for testing components that interact directly
   * with the AI SDK's language model interface.
   */
  readonly mockLanguageModelV1: LanguageModelV1;

  /**
   * Provides access to the mock ModelService instance used by the harness.
   * Useful for asserting interactions or configuring the mock model service behavior.
   */
  readonly mockModelService: ModelServiceApi;

  /**
   * Provides access to the mock ProviderService instance used by the harness.
   * Useful for asserting interactions or configuring the mock provider service behavior.
   */
  readonly mockProviderService: ProviderServiceApi;

  /**
   * Provides access to standardized mock implementations of all producer services.
   * These mocks can be used for testing components that depend on producer services.
   */
  readonly mockProducerServices: {
    /**
     * Mock implementation of the EmbeddingService.
     */
    readonly mockEmbeddingService: EmbeddingServiceApi;

    /**
     * Mock implementation of the TextService.
     */
    readonly mockTextService: TextServiceApi;

    /**
     * Mock implementation of the ImageService.
     */
    readonly mockImageService: ImageServiceApi;

    /**
     * Mock implementation of the ObjectService.
     */
    readonly mockObjectService: ObjectServiceApi;

    /**
     * Mock implementation of the TranscriptionService.
     */
    readonly mockTranscriptionService: TranscriptionServiceApi;

    /**
     * Mock implementation of the ChatService.
     */
    readonly mockChatService: ChatServiceApi;
  };

  /**
   * Resets all captured arguments stored by the mock services.
   * @returns An Effect that completes when arguments are reset.
   */
  resetMockCallArgs: () => Effect.Effect<void, never, never>;

  /**
   * Retrieves the arguments captured by various mock service calls.
   * @returns An Effect that yields the CapturedArgs object.
   */
  getMockCapturedArgs: () => Effect.Effect<CapturedArgs, never, never>;
}
