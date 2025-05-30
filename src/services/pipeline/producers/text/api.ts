import type { AgentRuntime } from "@/agent-runtime/types.js";
import type { GenerateBaseResult } from "@/services/pipeline/types.js";
import type { EffectiveResponse } from "@/types.js";
import type { Effect } from "effect";
import type { TextAgentState } from "./service.js";
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

  /**
   * Get the current agent state for monitoring/debugging
   * @returns Effect that resolves to the current TextAgentState
   */
  readonly getAgentState: () => Effect.Effect<TextAgentState, Error>;

  /**
   * Get the agent runtime for advanced operations
   * @returns The AgentRuntime instance
   */
  readonly getRuntime: () => AgentRuntime<TextAgentState>;

  /**
   * Terminate the text service agent
   * @returns Effect that resolves when termination is complete
   */
  readonly terminate: () => Effect.Effect<void, Error>;
}
