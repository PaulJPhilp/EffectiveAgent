import { ToolError } from "./tool-error.js";

/**
 * Error thrown when an exception occurs within the tool's specific `execute` function.
 * The `cause` property should contain the original error thrown by the tool logic.
 */
export class ToolExecutionError extends ToolError {
    constructor(message: string, options: ErrorOptions & { toolId: string; cause: unknown }) {
        super(message, options)
        this.name = "ToolExecutionError"
    }
} 