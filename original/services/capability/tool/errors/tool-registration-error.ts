import { ToolError } from "./tool-error.js"

/**
 * Error thrown when there is an issue registering a tool with the ToolService,
 * such as attempting to register a tool with an ID that already exists.
 */
export class ToolRegistrationError extends ToolError {
    constructor(message: string, options?: ErrorOptions & { toolId?: string }) {
        super(message, options)
        this.name = "ToolRegistrationError"
    }
} 