/**
 * API for the Transcription Service.
 * Defines methods for submitting audio and retrieving transcriptions.
 */
import { Effect } from "effect";
import type { TranscriptionResult } from "../../../../types.js";
import { TranscriptionError } from "./errors.js";

export interface TranscriptionServiceApi {
  /**
   * Submit audio data for transcription.
   * @param audio - The audio data (ArrayBuffer)
   * @returns Effect containing the transcription result or error
   */
  transcribe(audio: ArrayBuffer): Effect.Effect<TranscriptionResult, TranscriptionError>;

  /**
   * Retrieve the last transcription result.
   * @returns Effect containing the last result or error
   */
  getLastResult(): Effect.Effect<TranscriptionResult | null, never>;
}
