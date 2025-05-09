import { GenerateTextResult } from "@/services/ai/provider/types.js";
import type { Effect } from "effect";
import type { TextGenerationError, TextInputError, TextModelError, TextProviderError } from "./errors.js";
import type { TextGenerationOptions } from "./types.js";

export type { TextGenerationOptions };

export interface TextServiceApi {
  /**
   * Generates a text completion from the given prompt and model.
   * @param options - Options for text generation (prompt, modelId, parameters, etc.)
   * @returns Effect that resolves to an AiResponse or fails with a TextServiceError.
   * @throws {TextModelError} If the model is invalid or missing.
   * @throws {TextProviderError} If the provider is misconfigured or unavailable.
   * @throws {TextGenerationError} If the provider fails to generate text.
   */
  generate: (
    options: TextGenerationOptions
  ) => Effect.Effect<
    GenerateTextResult,
    TextModelError | TextProviderError | TextGenerationError | TextInputError
  >;
}
