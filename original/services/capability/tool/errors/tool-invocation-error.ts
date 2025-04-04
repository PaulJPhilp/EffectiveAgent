import { ToolError } from "./tool-error.js"
import { type ToolExecutionError } from "./tool-execution-error.ts"
import { type ToolNotFoundError } from "./tool-not-found-error.ts"
import { type ToolValidationError } from "./tool-validation-error.ts"

// Union type of errors that ToolInvocationError might wrap
export type ToolInvocationCause = ToolNotFoundError | ToolValidationError | ToolExecutionError | Error

/**
 * A general error thrown by the `ToolService.invokeTool` method when any part
 * of the invocation process fails (finding the tool, validating input,
 * executing the tool, or validating the output).
 *
 * The `cause` property will hold the specific underlying error
 * (e.g., ToolNotFoundError, ToolValidationError, ToolExecutionError, or a generic Error).
 */
export class ToolInvocationError extends ToolError {
    // Override cause to be more specific if needed, though ErrorOptions usually handles it
    public readonly cause: ToolInvocationCause

    constructor(message: string, options: ErrorOptions & { toolId: string; cause: ToolInvocationCause }) {
        super(message, options)
        this.name = "ToolInvocationError"
        this.cause = options.cause
    }
} 