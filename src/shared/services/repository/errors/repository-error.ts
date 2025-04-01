import { ServiceError } from "../../common/errors/service-error.js";

/**
 * Base class for errors originating from the RepositoryService.
 */
export class RepositoryError extends ServiceError {
    constructor(message: string, options?: ErrorOptions & { readonly details?: unknown }) {
        super(message, options)
        this.name = "RepositoryError"
        // Capture additional details if provided
        if (options?.details) {
            Object.defineProperty(this, 'details', {
                value: options.details,
                enumerable: false // Keep details out of standard enumeration like JSON.stringify
            });
        }
    }

    // Optionally declare the details property if you want it typed
    public readonly details?: unknown;
} 