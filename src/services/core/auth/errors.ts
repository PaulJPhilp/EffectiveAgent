/**
 * @file Error definitions for the Auth Service.
 * @module services/core/auth/errors
 */

import { Data } from "effect";

/**
 * Base error class for auth-related errors.
 */
export class AuthError extends Data.TaggedError("AuthError")<{
    readonly message: string;
    readonly cause?: unknown;
}> { }

/**
 * Error thrown when authentication fails.
 */
export class AuthenticationError extends Data.TaggedError("AuthenticationError")<{
    readonly message: string;
    readonly cause?: unknown;
}> { }

/**
 * Error thrown when authorization fails.
 */
export class AuthorizationError extends Data.TaggedError("AuthorizationError")<{
    readonly message: string;
    readonly requiredRoles?: readonly string[];
    readonly tenantId?: string;
    readonly cause?: unknown;
}> { }

/**
 * Error thrown when auth context is invalid.
 */
export class InvalidAuthContextError extends Data.TaggedError("InvalidAuthContextError")<{
    readonly message: string;
    readonly cause?: unknown;
}> { } 