import { Effect } from "effect";
import { PipelineConfig } from "../pipeline/types.js";
import { PipelineError } from "../pipeline/errors.js";

export interface GeminiProCodingPipelineApi {
  readonly _tag: "GeminiProCodingPipeline";
  readonly execute: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    config?: PipelineConfig
  ) => Effect.Effect<A, PipelineError, R>;
  readonly getSystemPrompt: () => string;
}
