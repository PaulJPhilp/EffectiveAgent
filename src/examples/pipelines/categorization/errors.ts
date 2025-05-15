import { Data } from "effect";

export type CategorizationErrorType =
    | "CategorizationAIError"
    | "CategorizationInvalidInputError";

export class CategorizationError extends Data.TaggedError("CategorizationError")<{
    readonly type: CategorizationErrorType;
    readonly message: string;
    readonly cause?: unknown;
    readonly details?: Record<string, any>;
}> { }

export function isCategorizationError(u: unknown): u is CategorizationError {
    return u instanceof CategorizationError;
}

export const makeCategorizationError = (
    type: CategorizationErrorType,
    message: string,
    cause?: unknown,
    details?: Record<string, any>
): CategorizationError =>
    new CategorizationError({
        type,
        message,
        cause,
        details
    }); 