/**
 * @file Chat service specific error types
 * @module services/ai/producers/chat/errors
 */
import { EffectiveError } from "@/errors.js";
/**
 * Error thrown when there are issues with chat model configuration or access.
 * @extends EffectiveError
 */
/**
 * Base error type for chat service errors
 */
export type ChatServiceError = ChatModelError | ChatProviderError | ChatCompletionError | ChatInputError | ChatToolError | ChatParameterError;
/**
 * Error thrown when there is an issue with the model
 */
export declare class ChatModelError extends EffectiveError {
    constructor(params: {
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when there are issues with chat provider configuration or access.
 * @extends EffectiveError
 */
export declare class ChatProviderError extends EffectiveError {
    constructor(params: {
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when the chat completion request fails.
 * @extends EffectiveError
 */
export declare class ChatCompletionError extends EffectiveError {
    constructor(params: {
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when chat input validation fails.
 * @extends EffectiveError
 */
export declare class ChatInputError extends EffectiveError {
    constructor(params: {
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when tool configuration or usage fails.
 * @extends EffectiveError
 */
export declare class ChatToolError extends EffectiveError {
    constructor(params: {
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when parameter validation fails.
 * @extends EffectiveError
 */
export declare class ChatParameterError extends EffectiveError {
    constructor(params: {
        description: string;
        module: string;
        method: string;
        parameter: string;
        value: unknown;
        cause?: unknown;
    });
}
//# sourceMappingURL=errors.d.ts.map