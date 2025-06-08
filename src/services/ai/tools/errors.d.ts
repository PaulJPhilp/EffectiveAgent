/**
 * @file Defines specific errors for the Tool services.
 * @module services/tools/errors
 */
import { AppToolParseError, EffectiveError } from "../../../errors.js";
/**
 * Base error for all tool-related failures.
 * @extends EffectiveError
 */
export declare class ToolError extends EffectiveError {
    readonly toolName?: string;
    constructor(params: {
        toolName?: string;
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error when a requested tool cannot be found in the registry.
 * @extends EffectiveError
 */
export declare class ToolNotFoundError extends EffectiveError {
    readonly toolName: string;
    constructor(params: {
        toolName: string;
        module: string;
        method: string;
    });
}
/**
 * Error when the input provided to a tool fails validation against its inputSchema.
 * @extends EffectiveError
 */
export declare class ToolInputValidationError extends EffectiveError {
    readonly toolName: string;
    constructor(params: {
        toolName: string;
        module: string;
        method: string;
        context?: unknown;
        cause: AppToolParseError;
    });
}
/**
 * Error when the output produced by a tool's implementation fails validation against its outputSchema.
 * @extends EffectiveError
 */
export declare class ToolOutputValidationError extends EffectiveError {
    readonly toolName: string;
    constructor(params: {
        toolName: string;
        module: string;
        method: string;
        context?: unknown;
        cause: AppToolParseError;
    });
}
/**
 * Generic error occurring during the execution of a tool's implementation logic.
 * @extends EffectiveError
 */
export declare class ToolExecutionError extends EffectiveError {
    readonly toolName: string;
    readonly input?: unknown;
    constructor(params: {
        toolName: string;
        input?: unknown;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error when a requested toolkit cannot be found in the registry.
 * @extends EffectiveError
 */
export declare class ToolkitNotFoundError extends EffectiveError {
    readonly toolkitName: string;
    constructor(params: {
        toolkitName: string;
        module: string;
        method: string;
    });
}
/**
 * Error when toolkit dependencies cannot be resolved or installed.
 * @extends EffectiveError
 */
export declare class ToolkitDependencyError extends EffectiveError {
    readonly toolkitName: string;
    readonly dependency: string;
    constructor(params: {
        toolkitName: string;
        dependency: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error when toolkit configuration is invalid or missing required values.
 * @extends EffectiveError
 */
export declare class ToolkitConfigError extends EffectiveError {
    readonly toolkitName: string;
    constructor(params: {
        toolkitName: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
export { AppToolParseError };
//# sourceMappingURL=errors.d.ts.map