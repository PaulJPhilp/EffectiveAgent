/**
 * @file Defines specific errors for the Tool services.
 * @module services/tools/errors
 */

import { EffectiveError } from "@/errors.js";
import type { ParseError } from "effect/ParseResult";

/**
 * Base error for all tool-related failures.
 * @extends EffectiveError
 */
export class ToolError extends EffectiveError {
    public readonly toolName?: string;

    constructor(params: {
        toolName?: string;
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    }) {
        super({
            description: params.description,
            module: params.module,
            method: params.method,
            cause: params.cause,
        });
        this.toolName = params.toolName;
    }
}

/**
 * Error when a requested tool cannot be found in the registry.
 * @extends EffectiveError
 */
export class ToolNotFoundError extends EffectiveError {
    public readonly toolName: string;

    constructor(params: {
        toolName: string;
        module: string;
        method: string;
    }) {
        super({
            description: `Tool not found in registry: ${params.toolName}`,
            module: params.module,
            method: params.method,
        });
        this.toolName = params.toolName;
    }
}

/**
 * Error when the input provided to a tool fails validation against its inputSchema.
 * @extends EffectiveError
 */
export class ToolInputValidationError extends EffectiveError {
    public readonly toolName: string;

    constructor(params: {
        toolName: string;
        module: string;
        method: string;
        cause: ParseError;
    }) {
        super({
            description: `Invalid input provided for tool: ${params.toolName}`,
            module: params.module,
            method: params.method,
            cause: params.cause,
        });
        this.toolName = params.toolName;
    }
}

/**
 * Error when the output produced by a tool's implementation fails validation against its outputSchema.
 * @extends EffectiveError
 */
export class ToolOutputValidationError extends EffectiveError {
    public readonly toolName: string;

    constructor(params: {
        toolName: string;
        module: string;
        method: string;
        cause: ParseError;
    }) {
        super({
            description: `Invalid output received from tool implementation: ${params.toolName}`,
            module: params.module,
            method: params.method,
            cause: params.cause,
        });
        this.toolName = params.toolName;
    }
}

/**
 * Generic error occurring during the execution of a tool's implementation logic.
 * @extends EffectiveError
 */
export class ToolExecutionError extends EffectiveError {
    public readonly toolName: string;
    public readonly input?: unknown;

    constructor(params: {
        toolName: string;
        input?: unknown;
        module: string;
        method: string;
        cause?: unknown;
    }) {
        let detail = "Unknown execution error";
        const cause = params.cause;

        if (cause instanceof Error) {
            detail = cause.message;
        } else if (typeof cause === 'string') {
            // Include permission denial message directly
            if (cause.startsWith("Permission denied")) {
                detail = cause;
            } else {
                detail = cause;
            }
        }

        super({
            description: `Error during execution of tool '${params.toolName}': ${detail}`,
            module: params.module,
            method: params.method,
            cause: params.cause,
        });
        this.toolName = params.toolName;
        this.input = params.input;
    }
}
