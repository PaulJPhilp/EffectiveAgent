/**
 * @file Defines error types specific to the AI Model configuration service.
 * @module services/ai/model/errors
 */

import type { EntityLoadError, EntityParseError } from "@/services/core/errors.js";
import { Data } from "effect";
// Removed ServiceError import as Data.TaggedError is the base

/**
 * Error class for failures related to loading, parsing, or validating
 * the AI model configuration (e.g., 'models.json').
 * Extends Data.TaggedError for compatibility with Effect's Cause.Fail.
 */
export class ModelConfigError extends Data.TaggedError("ModelConfigError")<{
    readonly message: string;
    // Refine cause type based on usage in live.ts
    readonly cause: EntityLoadError | EntityParseError;
}> { }
