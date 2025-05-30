/**
 * API for the Transcription Service.
 * Defines methods for submitting audio and retrieving transcriptions.
 */
import type { AgentRuntime } from "@/agent-runtime/types.js";
import { Effect } from "effect";
import type { TranscriptionResult } from "../../../../types.js";
import type { TranscriptionAgentState, TranscriptionOptions } from "./service.js";

export interface TranscriptionServiceApi {
  /**
   * Transcribes audio based on the provided options.
   * @param options Options for audio transcription.
   * @returns Effect that resolves to a transcription result or fails with a TranscriptionError.
   */
  readonly transcribe: (
    options: TranscriptionOptions
  ) => Effect.Effect<{ data: TranscriptionResult; metadata: any }, Error>;

  /**
   * Get the current agent state for monitoring/debugging
   * @returns Effect that resolves to the current TranscriptionAgentState
   */
  readonly getAgentState: () => Effect.Effect<TranscriptionAgentState, Error>;

  /**
   * Get the agent runtime for advanced operations
   * @returns The AgentRuntime instance
   */
  readonly getRuntime: () => AgentRuntime<TranscriptionAgentState>;

  /**
   * Terminate the transcription service agent
   * @returns Effect that resolves when termination is complete
   */
  readonly terminate: () => Effect.Effect<void, Error>;
}
