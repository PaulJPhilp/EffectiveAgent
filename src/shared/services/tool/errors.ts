import { ToolError } from "./errors/tool-error.js"

/**
 * Error thrown when there is an issue with tool configuration
 */
export class ToolConfigurationError extends ToolError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options)
        this.name = "ToolConfigurationError"
    }
} 