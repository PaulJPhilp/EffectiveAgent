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
  }
}

/**
 * The base error for all application-specific errors in EffectiveAgent.
 * Adds module, method, and any additional context needed for debugging.
 */
export class EffectiveError extends BaseError {
  public readonly module: string
  public readonly method: string
  public readonly cause?: unknown
  public readonly description: string

  constructor(params: {
    description: string
    module: string
    method: string
    cause?: unknown
  }) {
    super(params.description)
    this.description = params.description
    this.module = params.module
    this.method = params.method
    this.cause = params.cause
  }
}

/**
 * Base class for errors originating from services.
 * Allows associating an optional cause.
 */
export class ServiceError extends EffectiveError {
  constructor(params: {
    description: string
    module: string
    method: string
    cause?: unknown
  }) {
    super(params)
  }
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
