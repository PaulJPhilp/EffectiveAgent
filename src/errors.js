/**
 * @file Global error definitions for EffectiveAgent.
 * @module errors
 */
import { Effect } from "effect";
/**
 * The base error class for all application-specific errors in EffectiveAgent.
 */
export class BaseError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        // Ensure proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, BaseError.prototype);
    }
}
/**
 * The base error for all application-specific errors in EffectiveAgent.
 * Adds module, method, and any additional context needed for debugging.
 */
export class EffectiveError extends BaseError {
    module;
    method;
    cause;
    description;
    constructor(params) {
        super(params.description);
        this.description = params.description;
        this.module = params.module;
        this.method = params.method;
        this.cause = params.cause;
    }
    /**
     * Get a string representation of the error
     */
    toString() {
        return `${this.name}: ${this.message} [module: ${this.module}, method: ${this.method}]${this.cause ? `\nCaused by: ${this.cause}` : ""}`;
    }
}
/**
 * Base class for errors originating from services.
 * Allows associating an optional cause.
 */
export class ServiceError extends EffectiveError {
    constructor(params) {
        super(params);
    }
}
/**
 * Error thrown when loading an entity from storage fails.
 */
export class EntityLoadError extends EffectiveError {
    filePath;
    constructor(params) {
        super(params);
        this.filePath = params.filePath;
    }
}
/**
 * Error thrown when parsing an entity fails.
 */
export class EntityParseError extends EffectiveError {
    filePath;
    constructor(params) {
        super(params);
        this.filePath = params.filePath;
    }
}
/**
 * Generic error for tool input/output parsing failures (distinct from Effect Schema ParseError).
 * Use this for tool input/output validation errors to avoid confusion with Effect Schema errors.
 * @extends EffectiveError
 */
export class AppToolParseError extends EffectiveError {
    context;
    parseError;
    constructor(params) {
        super({
            description: params.description,
            module: params.module,
            method: params.method,
            cause: params.cause
        });
        this.context = params.context;
        this.parseError = params.parseError;
    }
}
/**
 * Effect integration for error mapping
 * Maps unknown errors to typed ServiceError instances
 * @param effect - The effect to map errors for
 * @returns Effect with mapped error types
 */
export const withErrorMapping = (effect) => Effect.catchAll(effect, error => Effect.fail(error instanceof Error ? new ServiceError({
    description: error.message,
    module: "core",
    method: "unknown",
    cause: error
}) : new ServiceError({
    description: String(error),
    module: "core",
    method: "unknown"
})));
//# sourceMappingURL=errors.js.map