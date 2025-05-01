import { EffectiveError } from "@/effective-error.js";

/**
 * Base error for Executive Service operations.
 * Extends EffectiveError for global error handling and context.
 * RQ-ES-13
 */
export class ExecutiveServiceError extends EffectiveError {
  readonly context?: Record<string, unknown>;
  constructor(params: {
    description: string;
    module: string;
    method: string;
    cause?: unknown;
    context?: Record<string, unknown>;
  }) {
    super(params);
    this.context = params.context;
  }
}

/**
 * Error indicating an internal constraint violation.
 * RQ-ES-07
 */
export class ConstraintError extends ExecutiveServiceError {
  readonly constraint: "maxAttempts" | "maxCumulativeTokens";
  readonly limit: number;
  readonly actual?: number;
  constructor(params: {
    description: string;
    module: string;
    method: string;
    constraint: "maxAttempts" | "maxCumulativeTokens";
    limit: number;
    actual?: number;
    cause?: unknown;
    context?: Record<string, unknown>;
  }) {
    super(params);
    this.constraint = params.constraint;
    this.limit = params.limit;
    this.actual = params.actual;
  }
}

