/**
 * @file Defines the base AppError type for the application.
 * Service-specific errors should typically extend Data.TaggedError directly
 * but can include similar context fields if needed.
 */

import { Data } from "effect";

/**
 * Base interface for common error context.
 * Specific errors can extend or use this structure.
 */
export interface BaseErrorContext {
    readonly message?: string; // Optional descriptive message
    readonly cause?: unknown; // Optional underlying cause
    readonly details?: Record<string, unknown>; // Optional additional structured details
}

/**
 * Base application error class using Data.TaggedError.
 * While service-specific errors often use their own tags directly,
 * this provides a reference structure.
 */
export class AppError extends Data.TaggedError("AppError")<BaseErrorContext> {
    /**
     * A string literal uniquely identifying the type of error.
     * Useful for logging or coarse-grained error handling.
     * Specific errors should override this.
     */
    get errorType(): string {
        return "GenericAppError";
    }

    /**
     * Suggested HTTP status code for API responses.
     * Specific errors should override this.
     */
    get httpStatusCode(): number {
        return 500; // Default to Internal Server Error
    }

    /**
     * Provides a combined message including the errorType and any specific message.
     */
    get fullMessage(): string {
        return `${this.errorType}${this.message ? `: ${this.message}` : ""}`;
    }
}

// Example of how a service error *could* extend AppError, though
// extending Data.TaggedError directly is often preferred in Effect:
/*
import { AppError, BaseErrorContext } from "@services/errors";

interface MyServiceErrorContext extends BaseErrorContext {
  readonly specificField: string;
}

export class MyServiceError extends AppError {
  readonly _tag = "MyServiceError"; // Override the tag

  constructor(readonly context: MyServiceErrorContext) {
    super(context);
  }

  get errorType(): string {
    return "MyServiceError"; // Override type
  }

  get httpStatusCode(): number {
    return 400; // Override status code
  }
}
*/
