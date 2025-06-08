/**
 * @file Defines specific errors for the Tool services.
 * @module services/tools/errors
 */
import { AppToolParseError, EffectiveError } from "../../../errors.js";
/**
 * Base error for all tool-related failures.
 * @extends EffectiveError
 */
export class ToolError extends EffectiveError {
    toolName;
    constructor(params) {
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
    toolName;
    constructor(params) {
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
    toolName;
    constructor(params) {
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
    toolName;
    constructor(params) {
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
    toolName;
    input;
    constructor(params) {
        let detail = "Unknown execution error";
        const cause = params.cause;
        if (cause instanceof Error) {
            detail = cause.message;
        }
        else if (typeof cause === 'string') {
            // Include permission denial message directly
            if (cause.startsWith("Permission denied")) {
                detail = cause;
            }
            else {
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
/**
 * Error when a requested toolkit cannot be found in the registry.
 * @extends EffectiveError
 */
export class ToolkitNotFoundError extends EffectiveError {
    toolkitName;
    constructor(params) {
        super({
            description: `Toolkit not found in registry: ${params.toolkitName}`,
            module: params.module,
            method: params.method,
        });
        this.toolkitName = params.toolkitName;
    }
}
/**
 * Error when toolkit dependencies cannot be resolved or installed.
 * @extends EffectiveError
 */
export class ToolkitDependencyError extends EffectiveError {
    toolkitName;
    dependency;
    constructor(params) {
        super({
            description: `Failed to resolve dependency '${params.dependency}' for toolkit '${params.toolkitName}'`,
            module: params.module,
            method: params.method,
            cause: params.cause,
        });
        this.toolkitName = params.toolkitName;
        this.dependency = params.dependency;
    }
}
/**
 * Error when toolkit configuration is invalid or missing required values.
 * @extends EffectiveError
 */
export class ToolkitConfigError extends EffectiveError {
    toolkitName;
    constructor(params) {
        super({
            description: `Invalid configuration for toolkit '${params.toolkitName}'`,
            module: params.module,
            method: params.method,
            cause: params.cause,
        });
        this.toolkitName = params.toolkitName;
    }
}
export { AppToolParseError };
//# sourceMappingURL=errors.js.map