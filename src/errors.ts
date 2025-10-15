/**
 * @file Global error definitions for EffectiveAgent.
 * @module errors
 */

import { Effect } from "effect"

/**
 * The base error class for all application-specific errors in EffectiveAgent.
 */
export class BaseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, BaseError.prototype)
  }
}

/**
 * The base error for all application-specific errors in EffectiveAgent.
 * Adds module, method, and any additional context needed for debugging.
 */
export class EffectiveError extends BaseError {
  public readonly module: string;
  public readonly method: string;
  public readonly cause?: unknown;
  public readonly description: string;

  constructor(params: {
    description: string;
    module: string;
    method: string;
    cause?: unknown;
  }) {
    super(params.description);
    this.description = params.description;
    this.module = params.module;
    this.method = params.method;
    this.cause = params.cause;
  }

  /**
   * Get a string representation of the error
   */
  toString(): string {
    return `${this.name}: ${this.message} [module: ${this.module}, method: ${this.method}]${
      this.cause ? `\nCaused by: ${this.cause}` : ""
    }`;
  }
}

/**
 * Base class for errors originating from services.
 * Allows associating an optional cause.
 */
export class ServiceError extends EffectiveError {
}

/**
 * Error thrown when loading an entity from storage fails.
 */
export class EntityLoadError extends EffectiveError {
  readonly filePath: string

  constructor(params: {
    filePath: string
    description: string
    module: string
    method: string
    cause?: unknown
  }) {
    super(params)
    this.filePath = params.filePath
  }
}

/**
 * Error thrown when parsing an entity fails.
 */
export class EntityParseError extends EffectiveError {
  readonly filePath: string

  constructor(params: {
    filePath: string
    description: string
    module: string
    method: string
    cause?: unknown
  }) {
    super(params)
    this.filePath = params.filePath
  }
}

/**
 * Generic error for tool input/output parsing failures (distinct from Effect Schema ParseError).
 * Use this for tool input/output validation errors to avoid confusion with Effect Schema errors.
 * @extends EffectiveError
 */
export class AppToolParseError extends EffectiveError {
  public readonly context?: unknown;
  public readonly parseError?: unknown;

  constructor(params: {
    description: string;
    module: string;
    method: string;
    context?: unknown;
    parseError?: unknown;
    cause?: unknown;
  }) {
    super({
      description: params.description,
      module: params.module,
      method: params.method,
      cause: params.cause
    });
    this.context = params.context;
    this.parseError = params.parseError;
  }
}

/**
 * Effect integration for error mapping
 * Maps unknown errors to typed ServiceError instances
 * @param effect - The effect to map errors for
 * @returns Effect with mapped error types
 */
export const withErrorMapping = <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, ServiceError | EntityLoadError | EntityParseError, A> =>
  Effect.catchAll(effect, error =>
    Effect.fail(error instanceof Error ? new ServiceError({
      description: error.message,
      module: "core",
      method: "unknown",
      cause: error
    }) : new ServiceError({
      description: String(error),
      module: "core",
      method: "unknown"
    }))
  )
