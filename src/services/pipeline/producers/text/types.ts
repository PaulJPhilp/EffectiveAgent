import type { Option } from "effect";
import type { Span } from "effect/Tracer";

/**
 * Options for text generation
 */
export interface TextGenerationOptions {
    /** The model ID to use */
    readonly modelId?: string;
    /** The text prompt to process */
    readonly prompt: string;
    /** The system prompt or instructions */
    readonly system: Option.Option<string>;
    /** Optional parameters for model behavior */
    readonly parameters?: {
        /** Maximum tokens to generate */
        maxSteps?: number;
        /** Maximum retries on failure */
        maxRetries?: number;
        /** Temperature (0-2) */
        temperature?: number;
        /** Top-p sampling */
        topP?: number;
        /** Top-k sampling */
        topK?: number;
        /** Presence penalty */
        presencePenalty?: number;
        /** Frequency penalty */
        frequencyPenalty?: number;
        /** Random seed */
        seed?: number;
        /** Stop sequences */
        stop?: string[];
    };
    /** Tracing span for observability */
    readonly span?: Span;
    /** Optional signal to abort the operation */
    readonly signal?: AbortSignal;
} 