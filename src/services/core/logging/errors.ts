import { Data } from "effect";

/**
 * Error type for all logging service errors.
 */
export class LoggingServiceError extends Data.TaggedError("LoggingServiceError")<{
  readonly description: string;
  readonly module: string;
  readonly method: string;
  readonly cause?: unknown;
}> {}
