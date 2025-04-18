import { Data } from "effect";

/**
 * Represents an error occurring during the validation or update
 * of an Intelligence definition against its schema.
 */
export class WorkbenchConfigError extends Data.TaggedError(
    "IntelligenceConfigError",
)<{
    readonly message: string;
    readonly cause: unknown;
}> { }