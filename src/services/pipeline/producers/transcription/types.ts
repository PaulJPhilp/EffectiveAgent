/**
 * Types for the Transcription Service.
 */

/**
 * Result of the transcription process
 */
export interface TranscriptionResult {
  readonly text: string;
  readonly model: string;
  readonly timestamp: Date;
  readonly id: string;
  readonly segments?: Array<{
    readonly id: number;
    readonly start: number;
    readonly end: number;
    readonly text: string;
    readonly confidence?: number;
    readonly speaker?: string;
    readonly language?: string;
  }>;
  readonly detectedLanguage?: string;
  readonly duration?: number;
  readonly usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
