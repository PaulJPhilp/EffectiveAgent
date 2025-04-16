/**
 * @file Defines specific errors for the AI Provider configuration loading process.
 * @module services/ai/provider/errors
 */

import type { ParseError } from "@effect/schema/ParseResult";
import { Data } from "effect";

/**
 * Represents an error occurring during the loading or validation of the
 * provider configuration.
 */
export class ProviderConfigError extends Data.TaggedError("ProviderConfigError")<{
    readonly message: string;
    readonly cause?: ParseError | Error;
}> { }
