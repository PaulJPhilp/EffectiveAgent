import { AiError } from "@effect/ai/AiError";

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
