export * from "./tool-error.js"
export * from "./tool-execution-error.ts"
export * from "./tool-invocation-error.ts"
export * from "./tool-not-found-error.ts"
export * from "./tool-registration-error.ts"
export * from "./tool-validation-error.ts"

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
