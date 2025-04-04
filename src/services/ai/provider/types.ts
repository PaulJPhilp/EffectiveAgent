/**
 * @file Defines interfaces, Tags, and types for the AI Provider service.
 */

import { Context, Effect, Stream } from "effect";
import type { ConfigError } from "effect/ConfigError"; // Import ConfigError if needed for Layer R type
import type { ChatMessage, Id, JsonObject } from "../../types.js"; // Import global types
import type { ToolDefinition } from "../../capabilities/tool/types.js"; // Import ToolDefinition
import type { ProviderError } from "./errors.js"; // Import base ProviderError
import type { ProviderConfig } from "./schema.js"; // Import config schema type

// --- Service Interfaces & Tags ---

/** Service interface for accessing loaded provider configuration. */
export interface ProviderConfiguration {
    readonly getProviderConfigByName: (
        name: string // e.g., "openai", "anthropic"
    ) => Effect.Effect<ProviderConfig, ProviderError>; // Find specific provider config
    readonly getDefaultProviderName: () => Effect.Effect<string, ProviderError>; // Get default name
    readonly resolveModelId: ( // Map a generic modelId to provider-specific one
        modelId: string // e.g., "openai/gpt-4o", "gpt-4o" (if default), "claude-3.5-sonnet"
    ) => Effect.Effect<{ providerConfig: ProviderConfig; resolvedModelName: string }, ProviderError>;
}
/** Tag for the ProviderConfiguration service. */
export const ProviderConfiguration = Context.GenericTag<ProviderConfiguration>(
    "ProviderConfiguration"
);

/** Service interface for interacting with LLM providers. */
export interface ProviderApi {
    /** Generates a complete chat response (non-streaming). */
    readonly generateChatCompletion: (
        params: ChatCompletionParams
        // Requires ProviderConfiguration for details and Config for API keys
    ) => Effect.Effect<ChatMessage, ProviderError, ProviderConfiguration | ConfigError>; // R type includes ConfigError from key loading

    /** Generates a streaming chat response. */
    readonly streamChatCompletion: (
        params: ChatCompletionParams
        // Requires ProviderConfiguration for details and Config for API keys
    ) => Stream.Stream<ChatCompletionChunk, ProviderError, ProviderConfiguration | ConfigError>; // R type includes ConfigError
}
/** Tag for the ProviderApi service. */
export const ProviderApi = Context.GenericTag<ProviderApi>("ProviderApi");

// --- Method Parameter & Return Types ---

/** Parameters for chat completion requests. */
export interface ChatCompletionParams {
    /**
     * The identifier for the model to use (e.g., "openai/gpt-4o", "anthropic/claude-3.5-sonnet").
     * The service will resolve this to a specific provider and model name.
     */
    readonly modelId: string;
    /** The sequence of messages representing the conversation history. */
    readonly messages: ReadonlyArray<ChatMessage>;
    /** Optional parameters controlling the generation process. */
    readonly options?: {
        readonly temperature?: number;
        readonly maxTokens?: number;
        readonly topP?: number;
        readonly stopSequences?: ReadonlyArray<string>;
        readonly presencePenalty?: number;
        readonly frequencyPenalty?: number;
        /** Tools the model may call. */
        readonly tools?: ReadonlyArray<ToolDefinition>; // Use ToolDefinition from capability/tool
        /** Controls which tool is called, if any. */
        readonly toolChoice?: "auto" | "required" | { type: "function"; function: { name: string } };
        /** User ID for tracking/moderation purposes (optional). */
        readonly userId?: string;
        // Add other common options compatible with Vercel AI SDK / OpenAI standard
    };
}

/**
 * Represents a chunk of data yielded by the streaming chat completion.
 * Structure aims to be compatible with Vercel AI SDK outputs.
 */
export type ChatCompletionChunk =
    | { readonly type: "text_delta"; readonly textDelta: string }
    | { readonly type: "tool_call_delta"; readonly toolCallId: string; readonly functionName: string; readonly argsDelta: string }
    | { readonly type: "tool_call"; readonly toolCall: ToolCall } // Complete tool call info
    | { readonly type: "finish"; readonly reason: FinishReason; readonly usage?: TokenUsage }
    | { readonly type: "error"; readonly error: unknown } // Error during stream processing
    | { readonly type: "other"; readonly data: JsonObject }; // For provider-specific extensions

/** Represents a complete tool call requested by the model. */
export interface ToolCall {
    readonly toolCallId: string;
    readonly toolName: string; // Corresponds to ToolDefinition.name
    readonly args: JsonObject; // Parsed arguments object
}

/** Reasons why a generation finished. */
export type FinishReason =
    | "stop" // Natural end of generation
    | "length" // Hit maxTokens limit
    | "tool_calls" // Model stopped to call tools
    | "content_filter" // Stopped due to content filtering
    | "error" // Provider-side error during generation
    | "other"; // Other provider-specific reasons

/** Token usage information. */
export interface TokenUsage {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
}
