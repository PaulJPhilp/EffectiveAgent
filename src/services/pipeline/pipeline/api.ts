import { Effect, Ref } from "effect";
import { EffectiveError } from "@/errors.js";
import type { PipelineAgentState } from "./service.js";

/**
 * Interface for the Pipeline Service
 * Simplified to avoid orchestration stacking with provider clients
 */
export interface PipelineServiceInterface {
  readonly _tag: "PipelineService";
  readonly execute: <A, E extends EffectiveError, R>(
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E, R>;

  /**
   * Get the current service state for monitoring/debugging
   * @returns Effect that resolves to the current PipelineAgentState
   */
  readonly getAgentState: () => Effect.Effect<PipelineAgentState, Error>;

  /**
   * Get the runtime status (returns error as runtime is not available in simplified state)
   * @returns Effect that resolves to state information
   */
  readonly getRuntime: () => Effect.Effect<
    { state: Ref.Ref<PipelineAgentState> },
    Error
  >;

  /**
   * Terminate the pipeline service (resets internal state)
   * @returns Effect that resolves when termination is complete
   */
  readonly terminate: () => Effect.Effect<void, Error>;
}
