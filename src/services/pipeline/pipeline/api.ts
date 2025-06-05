import { Effect, Ref } from "effect";
import {
  ExecutiveParameters,
  ExecutiveServiceError,
} from "../executive-service/index.js";
import type { PipelineAgentState } from "./service.js";

/**
 * Interface for the Pipeline Service
 */
export interface PipelineServiceInterface {
  readonly _tag: "PipelineService";
  readonly execute: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    parameters?: ExecutiveParameters,
  ) => Effect.Effect<A, E | ExecutiveServiceError, R>;

  /**
   * Get the current service state for monitoring/debugging
   * @returns Effect that resolves to the current PipelineAgentState
   */
  readonly getAgentState: () => Effect.Effect<PipelineAgentState, Error>;

  /**
   * Get the runtime status (returns error as runtime is not available in simplified state)
   * @returns Effect that resolves to state information
   */
  readonly getRuntime: () => Effect.Effect<{ state: Ref.Ref<PipelineAgentState> }, Error>;

  /**
   * Terminate the pipeline service (resets internal state)
   * @returns Effect that resolves when termination is complete
   */
  readonly terminate: () => Effect.Effect<void, Error>;
}