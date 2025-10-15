import type { Effect } from "effect";
import type { PipelineError } from "../pipeline/errors.js";
import type { PipelineConfig } from "../pipeline/types.js";

export interface GeminiProPipelineApi {
  readonly _tag: "GeminiProPipeline";
  readonly execute: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    config?: PipelineConfig
  ) => Effect.Effect<A, PipelineError, R>;
  readonly getSystemPrompt: () => string;
}
