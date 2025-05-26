/**
 * Base error class for EffectiveAgent errors
 */
export class EffectiveError extends Error {
  constructor(params: {
    description: string;
    module: string;
    method: string;
    cause?: unknown;
  }) {
    super(params.description);
    this.name = this.constructor.name;
    this.module = params.module;
    this.method = params.method;
    this.cause = params.cause;
  }

  readonly module: string;
  readonly method: string;
  readonly cause?: unknown;

  /**
   * Get a string representation of the error
   */
  toString(): string {
    return `${this.name}: ${this.message} [module: ${this.module}, method: ${this.method}]${
      this.cause ? `\nCaused by: ${this.cause}` : ""
    }`;
  }
}
