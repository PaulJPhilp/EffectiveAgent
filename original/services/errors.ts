/**
 * Base class for all custom service-related errors.
 * Provides a common foundation for error handling across different services.
 */
export class ServiceError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = this.constructor.name; // Set name to the specific subclass name

        // Maintain proper stack trace (usually needed for V8/Node)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
} 