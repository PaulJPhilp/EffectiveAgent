/**
 * @file Result types for AI operations
 * @module @effective-agent/ai-sdk/result-types
 */

import type { GenerateBaseResult } from "./types.js";

/**
 * Source reference (e.g., from web search)
 */
export interface Source {
  readonly sourceType: "url";
  readonly id: string;
  readonly url: string;
  readonly title?: string;
  readonly providerMetadata?: Record<string, unknown>;
}

/**
 * Response message from the model
 */
export interface ResponseMessage {
  readonly role: "system" | "user" | "assistant" | "tool";
  readonly content: string;
}

/**
 * Warning from the provider
 */
export interface Warning {
  readonly code: string;
  readonly message: string;
}

/**
 * Detailed reasoning step
 */
export interface ReasoningDetail {
  readonly step: number;
  readonly thought: string;
  readonly action?: string;
  readonly observation?: string;
}

/**
 * Tool call request from the LLM
 */
export interface ToolCallRequest {
  /** Unique identifier for this tool call */
  readonly id: string;
  /** Type of request */
  readonly type: "tool_call";
  /** The function/tool to be called */
  readonly function: {
    /** The name of the function */
    readonly name: string;
    /** The arguments as a JSON string */
    readonly arguments: string;
  };
}

/**
 * Text generation result
 */
export interface GenerateTextResult extends GenerateBaseResult {
  /** Generated text content */
  readonly text: string;
  /** Optional reasoning text */
  readonly reasoning?: string;
  /** Detailed reasoning parts */
  readonly reasoningDetails?: ReasoningDetail[];
  /** Sources used during generation */
  readonly sources?: Source[];
  /** Response messages generated */
  readonly messages?: ResponseMessage[];
  /** Warnings from the provider */
  readonly warnings?: Warning[];
  /** Optional array of tool calls requested by the model */
  readonly toolCalls?: ToolCallRequest[];
}

/**
 * Chat completion result (same as text generation)
 */
export type ChatResult = GenerateTextResult;

/**
 * Structured object generation result
 */
export interface GenerateObjectResult<T> extends GenerateBaseResult {
  /** Generated object conforming to the provided schema */
  readonly object: T;
}

/**
 * Embedding generation result
 */
export interface GenerateEmbeddingsResult extends GenerateBaseResult {
  /** Array of embedding vectors */
  readonly embeddings: number[][];
  /** Dimensions of each embedding vector */
  readonly dimensions: number;
  /** Original texts that were embedded */
  readonly texts: string[];
  /** Optional similarity scores if comparing embeddings */
  readonly similarityScores?: number[];
  /** Parameters used for embedding generation */
  readonly parameters: {
    /** Model-specific parameters */
    readonly modelParameters?: Record<string, unknown>;
    /** Normalization method applied */
    readonly normalization?: string;
    /** Text preprocessing steps applied */
    readonly preprocessing?: string[];
  };
}

/**
 * Image generation result
 */
export interface GenerateImageResult extends GenerateBaseResult {
  /** Generated image URL or base64 data */
  readonly imageUrl: string;
  /** Optional additional generated images */
  readonly additionalImages?: string[];
  /** Image generation parameters used */
  readonly parameters: {
    /** Size of the generated image */
    readonly size?: string;
    /** Quality setting used */
    readonly quality?: string;
    /** Style setting used */
    readonly style?: string;
  };
}

/**
 * Speech generation result
 */
export interface GenerateSpeechResult extends GenerateBaseResult {
  /** Generated audio data as base64 string or URL */
  readonly audioData: string;
  /** Audio format of the generated speech */
  readonly format: string;
  /** Speech generation parameters used */
  readonly parameters: {
    /** Voice ID or name used */
    readonly voice?: string;
    /** Speed/rate of speech */
    readonly speed?: string;
    /** Pitch adjustment */
    readonly pitch?: string;
    /** Language code */
    readonly language?: string;
  };
  /** Duration of the generated audio in seconds */
  readonly duration?: number;
}

/**
 * Transcription segment
 */
export interface TranscriptionSegment {
  /** Segment ID */
  readonly id: number;
  /** Start time in seconds */
  readonly start: number;
  /** End time in seconds */
  readonly end: number;
  /** Transcribed text for this segment */
  readonly text: string;
  /** Confidence score (0-1) */
  readonly confidence?: number;
  /** Speaker label if diarization enabled */
  readonly speaker?: string;
  /** Language detected for this segment */
  readonly language?: string;
}

/**
 * Transcription result
 */
export interface TranscribeResult extends GenerateBaseResult {
  /** Full transcribed text */
  readonly text: string;
  /** Detailed transcription segments with timing */
  readonly segments?: TranscriptionSegment[];
  /** Language detected in the audio */
  readonly detectedLanguage?: string;
  /** Duration of the audio in seconds */
  readonly duration?: number;
  /** Audio processing parameters used */
  readonly parameters: {
    /** Language hint provided */
    readonly language?: string;
    /** Whether speaker diarization was enabled */
    readonly diarization?: boolean;
    /** Whether timestamps were enabled */
    readonly timestamps?: boolean;
    /** Audio quality settings used */
    readonly quality?: string;
  };
}

/**
 * Streaming text chunk
 */
export interface StreamingTextChunk {
  /** Current chunk of generated text */
  readonly chunk: string;
  /** Full text generated so far */
  readonly text: string;
  /** Whether this is the final chunk */
  readonly isLast: boolean;
  /** Current token count */
  readonly currentTokenCount: number;
  /** Optional reasoning text */
  readonly reasoning?: string;
  /** Detailed reasoning parts */
  readonly reasoningDetails?: ReasoningDetail[];
  /** Sources used during generation */
  readonly sources?: Source[];
  /** Warnings from the provider */
  readonly warnings?: Warning[];
}

/**
 * Streaming object chunk
 */
export interface StreamingObjectChunk<T> {
  /** Current chunk of generated object */
  readonly chunk: Partial<T>;
  /** Full object generated so far */
  readonly object: Partial<T>;
  /** Whether this is the final chunk */
  readonly isLast: boolean;
  /** Current token count */
  readonly currentTokenCount: number;
}
