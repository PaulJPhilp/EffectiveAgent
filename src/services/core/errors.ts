/**
 * @file Core error types shared across services
 */

import { Data } from "effect";

/**
 * Error thrown when there are issues parsing an entity
 */
export class EntityParseError extends Data.TaggedError("EntityParseError")<{
    readonly filePath: string;
    readonly description: string;
    readonly module: string;
    readonly method: string;
    readonly cause?: unknown;
}> { }
