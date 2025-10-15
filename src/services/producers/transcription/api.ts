/**
 * @file API interface for TranscriptionService (AI speech-to-text producer).
 * Defines the contract for audio transcription using AI models/providers.
 */

import type { Effect, Ref } from "effect";
import type { EffectiveResponse } from "@/types.js";
import type { TranscriptionAgentState } from "./service.js";
import type { TranscriptionOptions, TranscriptionResult } from "./types.js";

export type { TranscriptionOptions, TranscriptionResult };

/**
 * API contract for the TranscriptionService.
 */
export interface TranscriptionServiceApi {
  /**
   * Transcribes audio based on the provided options.
   * @param options Options for transcription, including audio data and modelId.
   * @returns Effect that resolves to an EffectiveResponse or fails with a TranscriptionServiceError.
   */
  readonly transcribe: (
    options: TranscriptionOptions
  ) => Effect.Effect<EffectiveResponse<TranscriptionResult>, Error>;

  /**
   * Get the current service state for monitoring/debugging
   * @returns Effect that resolves to the current TranscriptionAgentState
   */
  readonly getAgentState: () => Effect.Effect<TranscriptionAgentState, Error>;

  /**
   * Get the runtime status (returns state information since runtime is not available in simplified service)
   * @returns Effect that resolves to state information
   */
  readonly getRuntime: () => Effect.Effect<{ state: Ref.Ref<TranscriptionAgentState> }, Error>;

  /**
   * Terminate the service (no-op since we don't have external runtime)
   * @returns Effect that succeeds
   */
  readonly terminate: () => Effect.Effect<void, Error>;
}
