import { Effect } from "effect";
import { PipelineConfig } from "../pipeline/types.js";
// PipelineService import removed
import { 
  PipelineError, 
  PipelineSharedExecutionError, 
  PipelineConfigError, 
  PipelineValidationError 
} from "../pipeline/errors.js";
import { GeminiProPipelineApi } from "./gemini-pro.api.js";

const SYSTEM_PROMPT = "You are a helpful AI assistant.";

export class GeminiProPipeline implements GeminiProPipelineApi {
  readonly _tag = "GeminiProPipeline" as const;

  constructor() {} // pipelineService removed

  static make = Effect.succeed(new GeminiProPipeline()); // Simplified make
  
  execute = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    config?: PipelineConfig // config is now unused here, but kept for API compatibility if necessary
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
          description: "An unexpected error occurred during Gemini Pro pipeline execution.",
          module: "GeminiProPipeline",
          method: "execute",
          cause: error as unknown
        }));
      })
    );
  };

  getSystemPrompt = (): string => SYSTEM_PROMPT;
}

export default GeminiProPipeline;