/**
 * @file Defines specific error types for the Prompt service.
 */

import { Data } from "effect";

/** Error related to loading or accessing prompt configuration. */
export class PromptConfigError extends Data.TaggedError("PromptConfigError")<{
    readonly message: string;
    readonly cause?: unknown; // Underlying error (e.g., from EntityLoader)
}> { }

/** Error indicating a specific prompt template name was not found. */
export class TemplateNotFoundError extends Data.TaggedError(
    "TemplateNotFoundError",
)<{
    readonly templateName: string;
    readonly message?: string;
}> { }

/** Error occurring during the rendering of a template string. */
export class RenderingError extends Data.TaggedError("RenderingError")<{
    readonly message: string;
    readonly templateName?: string; // Optional: name if rendering a stored template
    readonly templateSnippet?: string; // Optional: snippet of the string being rendered
    readonly cause?: unknown; // Underlying error from the template engine (e.g., LiquidJS)
}> { }

/** Union of all possible prompt service errors. */
export type PromptError =
    | PromptConfigError
    | TemplateNotFoundError
    | RenderingError;
