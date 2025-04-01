import { ToolError } from "./tool-error.js"

/**
 * Error thrown when a requested tool cannot be found by its ID in the ToolService registry.
 */
export class ToolNotFoundError extends ToolError {
    constructor(message: string, options?: ErrorOptions & { toolId: string }) {
        // Ensure toolId is always provided for this error type
        super(message, options)
        this.name = "ToolNotFoundError"
    }
} 