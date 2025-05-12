/**
 * Types for the Transcription Service.
 */
export interface TranscriptionResult {
  readonly text: string;
  readonly confidence: number;
  readonly words?: ReadonlyArray<{ word: string; start: number; end: number; confidence: number }>;
  readonly language?: string;
}
