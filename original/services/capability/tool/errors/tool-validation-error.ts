import { type ZodError } from "zod";
import { ToolError } from "./tool-error.js";

/**
 * Error thrown when tool input or output validation fails against the defined Zod schema.
 */
export class ToolValidationError extends ToolError {
    public readonly validationErrors: ZodError
    public readonly validationType: "input" | "output"

    constructor(
        message: string,
        options: ErrorOptions &
        { toolId: string; validationErrors: ZodError; validationType: "input" | "output" }
    ) {
        super(message, options)
        this.name = "ToolValidationError"
        this.validationErrors = options.validationErrors
        this.validationType = options.validationType
    }
} 