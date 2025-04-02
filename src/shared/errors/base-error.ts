interface ErrorParams {
  readonly name: string;
  readonly message: string;
  readonly cause?: Error;
}

export abstract class BaseError extends Error {
  readonly _tag: string = 'BaseError';
  readonly cause?: Error;

  constructor({ name, message, cause }: ErrorParams) {
    super(message);
    this.name = name;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
