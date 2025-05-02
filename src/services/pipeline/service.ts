import { Effect } from "effect";
import type { EffectiveInput, EffectiveResponse } from "./types/base.js";

/**
 * The AiPipeline service orchestrates the flow of data between AI producers,
 * capabilities, and the executive service. It acts as a mediator that:
 * 1. Processes input through the input service
 * 2. Routes requests to appropriate producers
 * 3. Coordinates with the executive service
 * 4. Manages chat history and context
 */
export interface AiPipelineApi {
  readonly process: (input: EffectiveInput) => Effect.Effect<EffectiveResponse, never>;
}

/**
 * Implementation of the AiPipeline service following the Effect.Service pattern.
 */
export class AiPipeline extends Effect.Service<AiPipelineApi>()(
  "AiPipeline",
  {
    effect: Effect.gen(function* () {
      return {
        process: (input: EffectiveInput) => Effect.succeed({
          text: "Not implemented yet",
          metadata: {},
          reasoning: { type: "text", text: "Not implemented yet" }
        })
      };
    })
  }
) {}
