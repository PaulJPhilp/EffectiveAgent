import { Effect } from "effect";
import { PipelineError } from "../pipeline/errors.js";
import { PipelineConfig } from "../pipeline/types.js";

export interface GeminiProCodingPipelineApi {
  readonly _tag: "GeminiProCodingPipeline";
  readonly execute: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    config?: PipelineConfig
  ) => Effect.Effect<A, PipelineError, R>;
  readonly getSystemPrompt: () => string;
}
