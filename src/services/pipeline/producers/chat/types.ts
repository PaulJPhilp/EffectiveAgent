/**
 * @file Type definitions for the Chat Service
 */

import { Effect } from "effect";
import { Span } from "effect/Tracer";
import { CoreMessage } from "./utils.js";

export interface ChatCompletionOptions {
    readonly input: string;
    readonly modelId: string;
    readonly span: Span;
    readonly text: string;
    readonly system?: string;
    readonly signal?: AbortSignal;
    readonly parameters?: {
        readonly temperature?: number;
        readonly maxTokens?: number;
        readonly topP?: number;
        readonly presencePenalty?: number;
        readonly frequencyPenalty?: number;
        readonly stop?: string[];
    };
}

export interface ChatCompletionResult {
    readonly output: string;
    readonly usage: {
        readonly promptTokens: number;
        readonly completionTokens: number;
        readonly totalTokens: number;
    };
    readonly finishReason: string;
    readonly providerMetadata: Record<string, unknown>;
    readonly toolCalls: unknown[];
}

export interface ChatServiceApi {
    readonly generate: (options: ChatCompletionOptions) => Effect.Effect<{
        readonly data: ChatCompletionResult;
        readonly messages: readonly CoreMessage[];
    }>;
} 