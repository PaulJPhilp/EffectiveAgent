import { ServiceError } from "../errors.js";

/**
 * Base class for errors originating from the LoggingService.
 */
export class LoggingError extends ServiceError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options)
        this.name = "LoggingError"
    }
}

// Add other logging-specific errors here if needed 