import type { AgentRuntime } from "@/agent-runtime/api.js";
import { Effect } from "effect";
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
   * Get the current agent state for monitoring/debugging
   * @returns Effect that resolves to the current PipelineAgentState
   */
  readonly getAgentState: () => Effect.Effect<PipelineAgentState, Error>;

  /**
   * Get the agent runtime for advanced operations
   * @returns The AgentRuntime instance
   */
  readonly getRuntime: () => AgentRuntime<PipelineAgentState>;

  /**
   * Terminate the pipeline service agent
   * @returns Effect that resolves when termination is complete
   */
  readonly terminate: () => Effect.Effect<void, Error>;
}