export * from "./tool-error.js"
export * from "./tool-execution-error.js"
export * from "./tool-invocation-error.js"
export * from "./tool-not-found-error.js"
export * from "./tool-registration-error.js"
export * from "./tool-validation-error.js"

/**
 * Base error class for tool execution errors
 */
export class ToolExecutionError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options)
        this.name = "ToolExecutionError"
    }
}

/**
 * Error thrown when tool validation fails
 */
export class ToolValidationError extends ToolExecutionError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options)
        this.name = "ToolValidationError"
    }
}

/**
 * Error thrown when tool execution fails
 */
export class ToolRuntimeError extends ToolExecutionError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options)
        this.name = "ToolRuntimeError"
    }
}
