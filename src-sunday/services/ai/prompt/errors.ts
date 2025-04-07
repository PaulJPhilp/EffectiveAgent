/**
 * @file Defines errors specific to the Prompt Service.
 */

import { AppError } from "../../errors.js"; // Adjust path as needed

/** Base error for Prompt service operations. */
export class PromptError extends AppError {
    constructor(params: {
        message: string;
        templateName?: string;
        cause?: unknown;
        context?: Record<string, unknown>;
    }) {
        super({
            message: `Prompt Error${params.templateName ? ` ('${params.templateName}')` : ''}: ${params.message}`,
            cause: params.cause,
            context: { ...params.context, templateName: params.templateName, errorType: "PromptError" },
        });
    }
}

/** Error indicating a named template definition was not found. */
export class TemplateNotFoundError extends PromptError {
    constructor(params: { templateName: string; message?: string; cause?: unknown }) {
        super({
            templateName: params.templateName,
            message: params.message ?? `Template definition not found.`,
            cause: params.cause,
            context: { errorType: "TemplateNotFoundError" },
        });
    }
}

/** Error occurring during template rendering (e.g., LiquidJS syntax error). */
export class RenderingError extends PromptError {
    constructor(params: { templateName?: string; message: string; cause?: unknown; context?: Record<string, unknown> }) {
        super({
            templateName: params.templateName,
            message: `Rendering failed: ${params.message}`,
            cause: params.cause,
            context: { ...params.context, errorType: "RenderingError" },
        });
    }
}

/** Error related to loading or accessing prompt configuration. */
export class PromptConfigurationError extends AppError { // Extends AppError directly
    constructor(params: { message: string; cause?: unknown; context?: Record<string, unknown> }) {
        super({
            message: `Prompt Configuration Error: ${params.message}`,
            cause: params.cause,
            context: { ...params.context, errorType: "PromptConfigurationError" },
        });
    }
}
