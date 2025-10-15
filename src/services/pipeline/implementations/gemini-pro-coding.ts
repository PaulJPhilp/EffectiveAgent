import { Effect } from "effect";
// PipelineService import removed
import { 
  PipelineConfigError, 
  type PipelineError, 
  PipelineSharedExecutionError, 
  PipelineValidationError 
} from "../pipeline/errors.js";
import type { PipelineConfig } from "../pipeline/types.js";
import type { GeminiProCodingPipelineApi } from "./gemini-pro-coding.api.js";

const SYSTEM_PROMPT = "You are an expert coding AI assistant.";

export class GeminiProCodingPipeline implements GeminiProCodingPipelineApi {
  readonly _tag = "GeminiProCodingPipeline" as const;

  static make = Effect.succeed(new GeminiProCodingPipeline()); // Simplified make
  
  execute = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    _config?: PipelineConfig // config is now unused here, but kept for API compatibility if necessary
  ): Effect.Effect<A, PipelineError, R> => {
    // Directly execute the effect. Retry/timeout logic previously in PipelineService is removed.
    // The config parameter is no longer used by this direct execution.
    return effect.pipe(
      Effect.catchAll((error: E | PipelineError) => {
        if (
          error instanceof PipelineConfigError ||
          error instanceof PipelineSharedExecutionError ||
          error instanceof PipelineValidationError
        ) {
          return Effect.fail(error);
        }
        return Effect.fail(new PipelineSharedExecutionError({
          description: "An unexpected error occurred during Gemini Pro Coding pipeline execution.",
          module: "GeminiProCodingPipeline",
          method: "execute",
          cause: error as unknown
        }));
      })
    );
  };

  getSystemPrompt = (): string => SYSTEM_PROMPT;
}

export default GeminiProCodingPipeline;
