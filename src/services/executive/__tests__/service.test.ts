import { describe, it } from "vitest";
import { Duration, Effect } from "effect";
import { ExecutiveService } from "../service.js";
import { ExecutiveServiceError } from "../errors.js";
import { EffectiveError } from "@/errors.js";

// Helper for creating test effects
const createTestEffect = <A>(value: A, delay = 0): Effect.Effect<A> =>
  delay > 0
    ? Effect.gen(function* () {
        yield* Effect.sleep(Duration.millis(delay));
        return value;
      })
    : Effect.succeed(value);

describe("ExecutiveService", () => {
  // Basic execution tests
  it("should execute a simple effect successfully", () =>
    Effect.gen(function* () {
      const service = yield* ExecutiveService;
      const testValue = 42;
      const result = yield* service.execute(createTestEffect(testValue));
      
      const state = yield* service.getAgentState();
      
      // Verify result
      if (result !== testValue) {
        throw new EffectiveError({
          description: `Expected ${testValue}, got ${result}`,
          module: "executive-service-test",
          method: "execute"
        });
      }

      // Verify state
      if (state.executionCount !== 1) {
        throw new EffectiveError({
          description: `Expected execution count 1, got ${state.executionCount}`,
          module: "executive-service-test",
          method: "execute"
        });
      }
      if (!state.lastExecution._tag || !state.lastExecution.value.success) {
        throw new EffectiveError({
          description: "Expected successful last execution",
          module: "executive-service-test",
          method: "execute"
        });
      }
    }));

  it("should handle failed effects", () =>
    Effect.gen(function* () {
      const service = yield* ExecutiveService;
      const testError = new EffectiveError({
        description: "Test error",
        module: "executive-service-test",
        method: "execute"
      });
      
      const result = yield* Effect.either(
        service.execute(Effect.fail(testError))
      );

      const state = yield* service.getAgentState();

      // Verify error result
      if (result._tag !== "Left") {
        throw new EffectiveError({
          description: "Expected Left (failure) result",
          module: "executive-service-test",
          method: "execute"
        });
      }
      if (!(result.left instanceof ExecutiveServiceError)) {
        throw new EffectiveError({
          description: "Expected ExecutiveServiceError",
          module: "executive-service-test",
          method: "execute"
        });
      }

      // Verify state
      if (!state.lastExecution._tag || state.lastExecution.value.success) {
        throw new EffectiveError({
          description: "Expected failed last execution",
          module: "executive-service-test",
          method: "execute"
        });
      }
    }));

  // Retry tests
  it("should retry failed effects according to parameters", () =>
    Effect.gen(function* () {
      const service = yield* ExecutiveService;
      let attempts = 0;
      
      const failingEffect = Effect.gen(function* () {
        attempts++;
        if (attempts < 3) {
          return yield* Effect.fail(new EffectiveError({
            description: `Attempt ${attempts} failed`,
            module: "executive-service-test",
            method: "execute"
          }));
        }
        return attempts;
      });

      const result = yield* service.execute(failingEffect, {
        maxRetries: 3,
        operationName: "retry-test"
      });

      const state = yield* service.getAgentState();

      // Verify retry behavior
      if (result !== 3) {
        throw new EffectiveError({
          description: `Expected 3 attempts, got ${result}`,
          module: "executive-service-test",
          method: "execute"
        });
      }

      // Verify state
      if (!state.lastExecution._tag || !state.lastExecution.value.success) {
        throw new EffectiveError({
          description: "Expected successful last execution after retries",
          module: "executive-service-test",
          method: "execute"
        });
      }
    }));

  // Timeout tests
  it("should timeout long-running effects", () =>
    Effect.gen(function* () {
      const service = yield* ExecutiveService;
      const longEffect = createTestEffect(true, 2000); // 2 second delay

      const result = yield* Effect.either(
        service.execute(longEffect, {
          timeoutMs: 100,
          operationName: "timeout-test"
        })
      );

      const state = yield* service.getAgentState();

      // Verify timeout behavior
      if (result._tag !== "Left") {
        throw new EffectiveError({
          description: "Expected Left (failure) result due to timeout",
          module: "executive-service-test",
          method: "execute"
        });
      }

      // Verify state
      if (!state.lastExecution._tag || state.lastExecution.value.success) {
        throw new EffectiveError({
          description: "Expected failed last execution due to timeout",
          module: "executive-service-test",
          method: "execute"
        });
      }
    }));

  // State management tests
  it("should maintain execution history with limit", () =>
    Effect.gen(function* () {
      const service = yield* ExecutiveService;
      const executions = 25; // More than the 20 limit

      // Execute multiple operations
      for (let i = 0; i < executions; i++) {
        yield* service.execute(createTestEffect(i), {
          operationName: `execution-${i}`
        });
      }

      const state = yield* service.getAgentState();

      // Verify execution count
      if (state.executionCount !== executions) {
        throw new EffectiveError({
          description: `Expected ${executions} executions, got ${state.executionCount}`,
          module: "executive-service-test",
          method: "execute"
        });
      }

      // Verify history limit
      if (state.executionHistory.length !== 20) {
        throw new EffectiveError({
          description: `Expected 20 history entries, got ${state.executionHistory.length}`,
          module: "executive-service-test",
          method: "execute"
        });
      }
      
      // Verify last operation
      const lastOperation = state.executionHistory[state.executionHistory.length - 1].operationName;
      if (lastOperation !== "execution-24") {
        throw new EffectiveError({
          description: `Expected last operation to be execution-24, got ${lastOperation}`,
          module: "executive-service-test",
          method: "execute"
        });
      }
    }));

  // Parameter handling tests
  it("should handle execution parameters correctly", () =>
    Effect.gen(function* () {
      const service = yield* ExecutiveService;
      const params = {
        operationName: "test-operation",
        timeoutMs: 1000,
        maxRetries: 2
      };

      yield* service.execute(createTestEffect(true), params);

      const state = yield* service.getAgentState();

      // Verify execution record
      if (!state.lastExecution._tag) {
        throw new EffectiveError({
          description: "Expected last execution to exist",
          module: "executive-service-test",
          method: "execute"
        });
      }

      const lastExec = state.lastExecution.value;

      // Verify operation name
      if (lastExec.operationName !== params.operationName) {
        throw new EffectiveError({
          description: `Expected operation name ${params.operationName}, got ${lastExec.operationName}`,
          module: "executive-service-test",
          method: "execute"
        });
      }

      // Verify parameters
      if (!lastExec.parameters || lastExec.parameters.timeoutMs !== params.timeoutMs) {
        throw new EffectiveError({
          description: "Parameters not properly recorded in execution history",
          module: "executive-service-test",
          method: "execute"
        });
      }
    }));

  // Termination test
  it("should handle termination gracefully", () =>
    Effect.gen(function* () {
      const service = yield* ExecutiveService;
      yield* service.terminate();
      
      // Service should still be usable after termination
      const result = yield* service.execute(createTestEffect(true));
      if (!result) {
        throw new EffectiveError({
          description: "Service should be usable after termination",
          module: "executive-service-test",
          method: "execute"
        });
      }
    }));
});
