import type { GenerateBaseOptions, GenerateBaseResult } from "@/services/pipeline/types.js";
import { EffectiveResponse } from "@/types.js";
import type { Effect } from "effect";
import type { Span } from "effect/Tracer";

/**
 * Options for chat completion
 */
export interface ChatCompletionOptions extends GenerateBaseOptions {
    /** The conversation span for tracing */
    span: Span;
    /** Optional tool definitions */
    abortSignal?: AbortSignal;
    /** Optional tool definitions */
    tools?: Array<{
        /** Tool name */
        name: string;
        /** Tool description */
        description: string;
        /** Tool parameters schema */
        parameters: Record<string, unknown>;
    }>;
}

/**
 * Result of a chat completion
 */
export interface ChatCompletionResult extends GenerateBaseResult {
    /** Any tool calls made */
    toolCalls?: Array<{
        /** Tool name */
        name: string;
        /** Tool arguments */
        arguments: Record<string, unknown>;
    }>;
}

/**
 * Chat service API
 */
export interface ChatServiceApi {
    /** Generate a chat completion */
    readonly generate: (
        options: ChatCompletionOptions
    ) => Effect.Effect<EffectiveResponse<ChatCompletionResult>, Error>;
} 