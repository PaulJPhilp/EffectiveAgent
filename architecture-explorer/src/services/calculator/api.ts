import type { Effect } from "effect";

export interface CalculatorServiceApi {
  readonly add: (a: number, b: number) => Effect.Effect<number, never, never>;
  readonly subtract: (a: number, b: number) => Effect.Effect<number, never, never>;
  readonly multiply: (a: number, b: number) => Effect.Effect<number, never, never>;
  readonly divide: (a: number, b: number) => Effect.Effect<number, CalculatorError, never>;
}

export class CalculatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalculatorError";
  }
}
