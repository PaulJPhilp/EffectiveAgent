import { ServiceError } from "../../common/errors/service-error.js"; // Assuming base error path

/**
 * Base class for all errors originating from the ToolService or tool execution.
 */
export class ToolError extends ServiceError {
    // You can add common properties or methods for tool errors here if needed
    constructor(message: string, options?: ErrorOptions & { toolId?: string }) {
        super(message, options)
        this.name = "ToolError"
        // Optionally store toolId if provided
        if (options?.toolId) {
            Object.defineProperty(this, "toolId", {
                value: options.toolId,
                enumerable: false, // Keep it non-enumerable like standard Error properties
                writable: false,
                configurable: true
            })
        }
    }
}

// Add the toolId property signature to the class if you store it
declare module "./tool-error.js" {
    interface ToolError {
        readonly toolId?: string
    }
} 