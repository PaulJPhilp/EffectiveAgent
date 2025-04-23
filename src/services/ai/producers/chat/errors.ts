/**
 * @file Chat service specific error types
 * @module services/ai/producers/chat/errors
 */

import { AiError } from "@effect/ai/AiError"

/**
 * Error thrown when there are issues with chat model configuration or access
 */
export class ChatModelError extends AiError {
    constructor(message: string, options?: ErrorOptions) {
        super({
            description: message,
            module: "ChatService",
            method: "create",
            ...(options && { cause: options.cause })
        })
    }
}

/**
 * Error thrown when there are issues with chat provider configuration or access
 */
export class ChatProviderError extends AiError {
    constructor(message: string, options?: ErrorOptions) {
        super({
            description: message,
            module: "ChatService",
            method: "create",
            ...(options && { cause: options.cause })
        })
    }
}

/**
 * Error thrown when the chat completion request fails
 */
export class ChatCompletionError extends AiError {
    constructor(message: string, options?: ErrorOptions) {
        super({
            description: message,
            module: "ChatService",
            method: "create",
            ...(options && { cause: options.cause })
        })
    }
} 