import { Effect } from "effect";
import { CalculatorError, type CalculatorServiceApi } from "./api.js";

export class CalculatorService extends Effect.Service<CalculatorServiceApi>()(
  "CalculatorService",
  {
    effect: Effect.gen(function* () {
      yield* Effect.log("CalculatorService initialized");

      return {
        add: (a: number, b: number) => Effect.gen(function* () {
          yield* Effect.log(`Adding ${a} + ${b}`);
          return a + b;
        }),
        
        subtract: (a: number, b: number) => Effect.gen(function* () {
          yield* Effect.log(`Subtracting ${b} from ${a}`);
          return a - b;
        }),
        
        multiply: (a: number, b: number) => Effect.gen(function* () {
          yield* Effect.log(`Multiplying ${a} * ${b}`);
          return a * b;
        }),
        
        divide: (a: number, b: number) => Effect.gen(function* () {
          yield* Effect.log(`Dividing ${a} / ${b}`);
          if (b === 0) {
            yield* Effect.log("Division by zero error");
            return yield* Effect.fail(new CalculatorError("Division by zero"));
          }
          return a / b;
        })
      };
    })
  }
) {}
