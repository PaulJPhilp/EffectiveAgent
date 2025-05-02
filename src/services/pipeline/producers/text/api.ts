/**
 * TextService interface for handling AI text generation.
 */
import type { Effect, ConfigProvider, Option } from "effect"; 
import type { Span } from "effect/Tracer"; 
import type { AiResponse } from "@effect/ai/AiResponse";
import type { TextModelError, TextProviderError, TextGenerationError, TextInputError } from "@/services/ai/producers/text/errors.js";

/**
 * Options for text generation.
 */
export interface TextGenerationOptions {
  readonly modelId?: string;
  readonly prompt: string;
  readonly system: Option.Option<string>;
  readonly span?: Span;
  /** Optional abort signal for cancellation */
  readonly signal?: AbortSignal;
  readonly parameters?: Record<string, any>;
}

export interface TextServiceApi {
  /**
   * Generates a text completion from the given prompt and model.
   * @param options - Options for text generation (prompt, modelId, parameters, etc.)
   * @returns Effect that resolves to an AiResponse or fails with a TextServiceError.
   * @throws {TextModelError} If the model is invalid or missing.
   * @throws {TextProviderError} If the provider is misconfigured or unavailable.
   * @throws {TextGenerationError} If the provider fails to generate text.
   */
  readonly generate: (
    options: TextGenerationOptions
  ) => Effect.Effect<
    AiResponse,
    TextModelError | TextProviderError | TextGenerationError | TextInputError,
    ConfigProvider.ConfigProvider
  >;
}
