/**
 * @file Type definitions for the Chat Service
 */
import { Message } from "@/schema.js";
import { FinishReason } from "@/types.js";
import { Effect } from "effect";
import { Option } from "effect/Option";
import { Span } from "effect/Tracer";
import { CoreMessage } from "./utils.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
export interface ChatCompletionOptions {
    readonly input: string;
    readonly modelId: string;
    readonly span: Span;
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
/**
 * Provider-specific metadata for chat completions
 */
/**
 * Provider-specific metadata for chat completions
 */
export interface ProviderMetadata {
    readonly model: string;
    readonly provider: string;
    readonly temperature?: number;
    readonly maxTokens?: number;
    readonly [key: string]: string | number | boolean | undefined;
}
/**
 * Represents a tool call made by the AI
 */
/**
 * Tool call made by the AI
 */
export interface ToolCall {
    readonly id: string;
    readonly type: 'function';
    readonly function: {
        readonly name: string;
        readonly arguments: Record<string, string | number | boolean | null>;
    };
}
/**
 * Result of a chat completion request
 */
export interface ChatCompletionResult {
    readonly content: string;
    readonly usage: {
        readonly promptTokens: number;
        readonly completionTokens: number;
        readonly totalTokens: number;
    };
    readonly finishReason: FinishReason;
    readonly providerMetadata: ProviderMetadata;
    readonly toolCalls: ToolCall[];
}
/**
 * Options for creating a new chat completion
 */
/**
 * Options for creating a new chat completion
 */
export interface ChatCreationOptions {
    readonly modelId: string;
    readonly system: Option<string>;
    readonly input: Message;
}
/**
 * API interface for the chat completion service
 */
/**
 * Dependencies required by the chat service
 */
export interface ChatServiceDeps {
    readonly modelService: ModelService;
    readonly providerService: ProviderService;
}
/**
 * API interface for the chat completion service
 */
export interface ChatServiceApi {
    /**
     * Creates a new chat completion
     * @param options Chat completion creation options
     */
    create(options: ChatCreationOptions): Effect.Effect<ChatCompletionResult, unknown, unknown>;
    /**
     * Generates a chat completion
     * @param options Chat completion generation options
     */
    readonly generate: (options: ChatCompletionOptions) => Effect.Effect<{
        readonly data: ChatCompletionResult;
        readonly messages: readonly CoreMessage[];
    }>;
}
//# sourceMappingURL=types.d.ts.map