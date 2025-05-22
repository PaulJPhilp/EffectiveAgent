import type { GenerateBaseResult } from "@/services/pipeline/types.js";
import type { EffectiveResponse } from "@/types.js";
import type { Effect } from "effect";
import type { TextGenerationOptions } from "./types.js";

export type { TextGenerationOptions };

export interface TextServiceApi {
  /**
   * Generates text based on the provided options.
   * @param options Options for text generation.
   * @returns Effect that resolves to an EffectiveResponse or fails with a TextServiceError.
   */
  readonly generate: (
    options: TextGenerationOptions
  ) => Effect.Effect<EffectiveResponse<GenerateBaseResult>, Error>;
}
