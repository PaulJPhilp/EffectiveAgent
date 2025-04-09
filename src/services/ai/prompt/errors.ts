/**
 * @file Defines specific error types for the Prompt service.
 */

import type { ParseError } from "@effect/schema/ParseResult";
import { Data } from "effect";

/** Error related to loading or accessing prompt configuration. */
export class PromptConfigError extends Data.TaggedError("PromptConfigError")<{
    readonly message: string;
    readonly cause?: ParseError | Error;
}> { }

/** Error when a requested template is not found. */
export class TemplateNotFoundError extends Data.TaggedError("TemplateNotFoundError")<{
    readonly templateName: string;
}> { }

/** Error during template rendering. */
export class RenderingError extends Data.TaggedError("RenderingError")<{
    readonly message: string;
    readonly cause?: Error;
    readonly templateName?: string;
    readonly templateSnippet?: string;
}> { }

/** Union of all possible prompt service errors. */
export type PromptError = PromptConfigError | TemplateNotFoundError | RenderingError;
