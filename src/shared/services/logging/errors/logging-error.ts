import { ServiceError } from "../../common/errors/service-error.js"; // Assuming base error path

/**
 * Base class for errors originating from the LoggingService.
 */
export class LoggingError extends ServiceError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options)
        this.name = "LoggingError"
    }
} 