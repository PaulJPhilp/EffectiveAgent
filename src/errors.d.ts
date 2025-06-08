/**
 * @file Global error definitions for EffectiveAgent.
 * @module errors
 */
import { Effect } from "effect";
/**
 * The base error class for all application-specific errors in EffectiveAgent.
 */
export declare class BaseError extends Error {
    constructor(message: string);
}
/**
 * The base error for all application-specific errors in EffectiveAgent.
 * Adds module, method, and any additional context needed for debugging.
 */
export declare class EffectiveError extends BaseError {
    readonly module: string;
    readonly method: string;
    readonly cause?: unknown;
    readonly description: string;
    constructor(params: {
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    });
    /**
     * Get a string representation of the error
     */
    toString(): string;
}
/**
 * Base class for errors originating from services.
 * Allows associating an optional cause.
 */
export declare class ServiceError extends EffectiveError {
    constructor(params: {
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when loading an entity from storage fails.
 */
export declare class EntityLoadError extends EffectiveError {
    readonly filePath: string;
    constructor(params: {
        filePath: string;
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when parsing an entity fails.
 */
export declare class EntityParseError extends EffectiveError {
    readonly filePath: string;
    constructor(params: {
        filePath: string;
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Generic error for tool input/output parsing failures (distinct from Effect Schema ParseError).
 * Use this for tool input/output validation errors to avoid confusion with Effect Schema errors.
 * @extends EffectiveError
 */
export declare class AppToolParseError extends EffectiveError {
    readonly context?: unknown;
    readonly parseError?: unknown;
    constructor(params: {
        description: string;
        module: string;
        method: string;
        context?: unknown;
        parseError?: unknown;
        cause?: unknown;
    });
}
/**
 * Effect integration for error mapping
 * Maps unknown errors to typed ServiceError instances
 * @param effect - The effect to map errors for
 * @returns Effect with mapped error types
 */
export declare const withErrorMapping: <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, ServiceError | EntityLoadError | EntityParseError, A>;
//# sourceMappingURL=errors.d.ts.map