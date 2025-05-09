/**
 * @file Input type definitions for AI provider
 */

import { Schema as S } from "effect"

/**
 * Base options for all AI provider requests
 */
export interface BaseProviderOptions {
    readonly modelId: string
    readonly maxRetries?: number
    readonly temperature?: number
    readonly topP?: number
    readonly topK?: number
    readonly frequencyPenalty?: number
    readonly presencePenalty?: number
    readonly seed?: number
    readonly stop?: ReadonlyArray<string>
}

/**
 * Options specific to text generation
 */
export interface TextGenerationOptions extends BaseProviderOptions {
    readonly prompt: string
    readonly maxTokens?: number
    readonly systemPrompt?: string
}

/**
 * Options specific to chat completion
 */
export interface ChatCompletionOptions extends BaseProviderOptions {
    readonly messages: ReadonlyArray<{
        readonly role: "user" | "assistant" | "system"
        readonly content: string
    }>
    readonly maxTokens?: number
    readonly functions?: ReadonlyArray<{
        readonly name: string
        readonly description?: string
        readonly parameters: Record<string, unknown>
    }>
}

/**
 * Schema for provider response
 */
export class ProviderResponse extends S.Class<ProviderResponse>("ProviderResponse")({
    text: S.String,
    usage: S.optional(S.Struct({
        promptTokens: S.Number,
        completionTokens: S.Number,
        totalTokens: S.Number
    }))
}) { }

/**
 * Effective input type for provider operations
 */
export interface EffectiveInput {
    readonly messages: ReadonlyArray<{
        readonly role: "user" | "assistant" | "system"
        readonly content: string
    }>
    readonly functions?: ReadonlyArray<{
        readonly name: string
        readonly description?: string
        readonly parameters: Record<string, unknown>
    }>
    readonly stream?: boolean
    readonly maxTokens?: number
    readonly temperature?: number
    readonly topP?: number
    readonly topK?: number
    readonly frequencyPenalty?: number
    readonly presencePenalty?: number
    readonly stop?: ReadonlyArray<string>
} 