/**
 * @file Defines base error classes for services.
 * @module services/core/errors
 */

import { Data } from "effect";

/**
 * Base class for errors originating from services.
 * Allows associating an optional cause.
 */
export class ServiceError extends Error {
    public readonly cause?: unknown;

    constructor(message?: string, options?: { cause?: unknown }) {
        super(message);
        this.name = this.constructor.name; // Use the subclass name
        this.cause = options?.cause;

        // Ensure the prototype chain is set correctly for instanceof checks
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class EntityLoadError extends Data.TaggedError("EntityLoadError")<{
    readonly filePath: string;
    readonly message?: string;
    readonly cause?: unknown;
}> { }

export class EntityParseError extends Data.TaggedError("EntityParseError")<{
    readonly filePath: string;
    readonly cause?: unknown;
}> { } 