/**
 * @file Contract for LLM Service
 * @module ea/pipelines/structured-output/llm/contract
 */

import { Data, Effect } from "effect";

// === Errors ===

/**
 * Base error for LLM operations
 */
export class LlmError extends Data.TaggedError("LlmError")<{
    readonly message: string;
    readonly cause?: unknown;
}> {
    readonly _tag = "LlmError";
}

/**
 * Error thrown when LLM call fails
 */
export class LlmCallError extends LlmError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: `LLM call failed: ${params.message}`,
            cause: params.cause,
        });
    }
}

/**
 * Error thrown when LLM response parsing fails
 */
export class LlmResponseParseError extends LlmError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: `Failed to parse LLM response: ${params.message}`,
            cause: params.cause,
        });
    }
}

// === Types ===

/**
 * Configuration for LLM calls
 */
export interface LlmConfig {
    readonly model: string;
    readonly temperature: number;
    readonly maxTokens: number;
}

/**
 * API for LLM service
 */
export interface LlmServiceApi {
    readonly complete: (
        prompt: string,
        config?: Partial<LlmConfig>
    ) => Effect.Effect<string, LlmError>;

    readonly completeJson: <T>(
        prompt: string,
        config?: Partial<LlmConfig>
    ) => Effect.Effect<T, LlmError>;
}

/**
 * LLM Service Effect
 */
export abstract class LlmService extends Effect.Service<LlmServiceApi>()(
    "LlmService",
    {
        effect: Effect.gen(function* () {
            return {
                complete: (prompt: string) => 
                    Effect.fail(new LlmError({ message: "complete not implemented by default" })),
                completeJson: <T>(prompt: string) =>
                    Effect.fail(new LlmError({ message: "completeJson not implemented by default" }))
            };
        }),
        dependencies: []
    }
) { }
