import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { CalculatorService } from "../service.js";
import { CalculatorError } from "../api.js";

describe("CalculatorService", () => {
  it("should add two numbers", () =>
    Effect.gen(function* () {
      const service = yield* CalculatorService;
      const result = yield* service.add(2, 3);
      expect(result).toBe(5);
    })
  );

  it("should subtract two numbers", () =>
    Effect.gen(function* () {
      const service = yield* CalculatorService;
      const result = yield* service.subtract(5, 3);
      expect(result).toBe(2);
    })
  );

  it("should multiply two numbers", () =>
    Effect.gen(function* () {
      const service = yield* CalculatorService;
      const result = yield* service.multiply(4, 3);
      expect(result).toBe(12);
    })
  );

  it("should divide two numbers", () =>
    Effect.gen(function* () {
      const service = yield* CalculatorService;
      const result = yield* service.divide(6, 2);
      expect(result).toBe(3);
    })
  );

  it("should fail when dividing by zero", () =>
    Effect.gen(function* () {
      const service = yield* CalculatorService;
      const result = yield* Effect.either(service.divide(6, 0));
      
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(CalculatorError);
        expect(result.left.message).toBe("Division by zero");
      }
    })
  );
});
