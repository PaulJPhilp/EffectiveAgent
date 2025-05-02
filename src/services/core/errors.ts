/**
 * @file Defines base error classes for services.
 * @module services/core/errors
 */

import { Effect } from "effect";
import { EffectiveError } from "@/effective-error.js";

/**
 * Base class for errors originating from services.
 * Allows associating an optional cause.
 */
export class ServiceError extends EffectiveError {
    constructor(params: { description: string; module: string; method: string; cause?: unknown }) {
        super(params);
    }
}

/**
 * Error thrown when loading an entity from storage fails.
 * @extends EffectiveError
 */
export class EntityLoadError extends EffectiveError {
    readonly filePath: string;

    constructor(params: {
        filePath: string;
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    }) {
        super(params);
        this.filePath = params.filePath;
    }
}

/**
 * Error thrown when parsing an entity fails.
 * @extends EffectiveError
 */
export class EntityParseError extends EffectiveError {
    readonly filePath: string;

    constructor(params: {
        filePath: string;
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    }) {
        super(params);
        this.filePath = params.filePath;
    }
}

// Effect integration
export const withErrorMapping = <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, ServiceError | EntityLoadError | EntityParseError, A> =>
    Effect.catchAll(effect, error =>
        Effect.fail(error instanceof Error ? new ServiceError({
            description: error.message,
            module: "core",
            method: "unknown",
            cause: error
        }) : new ServiceError({
            description: String(error),
            module: "core",
            method: "unknown"
        }))
    );