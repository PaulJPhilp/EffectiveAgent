import { EffectiveError } from "../../../effective-error.js";

/**
 * Base error class for all policy service related errors
 */
export class PolicyError extends EffectiveError {
  constructor(params: {
    description: string;
    method: string;
    cause?: unknown;
  }) {
    super({
      ...params,
      module: "ai/policy"
    });
  }
}

/**
 * Error thrown when policy validation fails
 */
export class PolicyValidationError extends PolicyError {
  constructor(params: {
    description: string;
    method: string;
    cause?: unknown;
  }) {
    super(params);
  }
}

/**
 * Error thrown when policy check fails
 */
export class PolicyCheckError extends PolicyError {
  constructor(params: {
    description: string;
    method: string;
    cause?: unknown;
  }) {
    super(params);
  }
}

/**
 * Error thrown when there's an issue recording policy outcome
 */
export class PolicyRecordError extends PolicyError {
  constructor(params: {
    description: string;
    method: string;
    cause?: unknown;
  }) {
    super(params);
  }
}
