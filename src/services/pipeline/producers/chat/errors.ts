/**
 * @file Chat service specific error types
 * @module services/ai/producers/chat/errors
 */

import { EffectiveError } from "@/errors.js";

/**
 * Error thrown when there are issues with chat model configuration or access.
 * @extends EffectiveError
 */
export class ChatModelError extends EffectiveError {
    constructor(params: { description: string; module: string; method: string; cause?: unknown }) {
        super(params);
    }
}

/**
 * Error thrown when there are issues with chat provider configuration or access.
 * @extends EffectiveError
 */
export class ChatProviderError extends EffectiveError {
    constructor(params: { description: string; module: string; method: string; cause?: unknown }) {
        super(params);
    }
}

/**
 * Error thrown when the chat completion request fails.
 * @extends EffectiveError
 */
export class ChatCompletionError extends EffectiveError {
    constructor(params: { description: string; module: string; method: string; cause?: unknown }) {
        super(params);
    }
}

/**
 * Error thrown when chat input validation fails.
 * @extends EffectiveError
 */
export class ChatInputError extends EffectiveError {
    constructor(params: { description: string; module: string; method: string; cause?: unknown }) {
        super(params);
    }
}

/**
 * Error thrown when tool configuration or usage fails.
 * @extends EffectiveError
 */
export class ChatToolError extends EffectiveError {
    constructor(params: { description: string; module: string; method: string; cause?: unknown }) {
        super(params);
    }
}

/**
 * Error thrown when parameter validation fails.
 * @extends EffectiveError
 */
export class ChatParameterError extends EffectiveError {
    constructor(params: {
        description: string;
        module: string;
        method: string;
        parameter: string;
        value: unknown;
        cause?: unknown;
    }) {
        super({
            description: `${params.description} (parameter: ${params.parameter}, value: ${params.value})`,
            module: params.module,
            method: params.method,
            cause: params.cause
        });
    }
}