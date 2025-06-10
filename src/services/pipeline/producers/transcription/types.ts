import type { Span } from "effect/Tracer";

/**
 * Types for the Transcription Service.
 */

/**
 * Options for transcription process
 */
export interface TranscriptionOptions {
  /** The model ID to use */
  readonly modelId?: string;
  /** Base64 encoded audio data */
  readonly audioData: string;
  /** Tracing span for observability */
  readonly span?: Span;
  /** Optional signal to abort the operation */
  readonly signal?: AbortSignal;
  /** Optional parameters for model behavior */
  readonly parameters?: {
    /** Language code (e.g., 'en', 'fr') */
    language?: string;
    /** Maximum number of speakers to identify */
    maxSpeakers?: number;
    /** Whether to detect language automatically */
    detectLanguage?: boolean;
    /** Whether to include word-level timestamps */
    wordTimestamps?: boolean;
  };
}

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
