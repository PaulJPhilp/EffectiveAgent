/**
 * @file Global error definitions for EffectiveAgent.
 * @module errors
 */

import { AiError } from "@effect/ai/AiError";
import { Effect } from "effect";

/**
 * The base error for all application-specific errors in EffectiveAgent.
 * Adds module, method, and any additional context needed for debugging.
 */
export class EffectiveError extends AiError {
  public readonly module: string;
  public readonly method: string;
  public readonly cause?: unknown;

  constructor(params: {
    description: string;
    module: string;
    method: string;
    cause?: unknown;
  }) {
    super({ description: params.description, cause: params.cause, module: params.module, method: params.method });
    this.module = params.module;
    this.method = params.method;
    this.cause = params.cause;
  }
}

/**
 * Base class for errors originating from services.
 * Allows associating an optional cause.
 */
export class ServiceError extends EffectiveError {
  constructor(params: { description: string; module: string; method: string; cause?: unknown }) {
    super(params);
  }
}

/**
 * Error thrown when loading an entity from storage fails.
 */
export class EntityLoadError extends EffectiveError {
  readonly filePath: string;

  constructor(params: {
    filePath: string;
    description: string;
    module: string;
    method: string;
    cause?: unknown;
  }) {
    super(params);
    this.filePath = params.filePath;
  }
}

/**
 * Error thrown when parsing an entity fails.
 */
export class EntityParseError extends EffectiveError {
  readonly filePath: string;

  constructor(params: {
    filePath: string;
    description: string;
    module: string;
    method: string;
    cause?: unknown;
  }) {
    super(params);
    this.filePath = params.filePath;
  }
}

/**
 * Effect integration for error mapping
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
  );
