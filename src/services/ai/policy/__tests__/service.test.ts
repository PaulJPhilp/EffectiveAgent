import { Effect } from "effect";
import { describe, it, expect, vi } from "vitest";
import PolicyService from "../service.js";
import PermissivePolicyService from "../permissive-service.js";
import { PolicyCheckContext, PolicyRecordContext } from "../types.js";

describe("PolicyService", () => {
  describe("Base PolicyService implementation", () => {
    // Policy check tests
    it("should allow operations by default", async () => {
      const testContext: PolicyCheckContext = {
        auth: { userId: "test-user" },
        requestedModel: "gpt-4",
        operationType: "text:generate"
      };

      const program = Effect.gen(function* (_) {
        // Create a new instance using the make factory method
        const service = yield* PolicyService.make();
        
        // Check policy
        const result = yield* service.checkPolicy(testContext);
        return result;
      });

      const result = await Effect.runPromise(program);
      
      expect(result.allowed).toBe(true);
      expect(result.effectiveModel).toBe(testContext.requestedModel);
    });

    // Record outcome tests
    it("should record outcomes without errors", async () => {
      const testOutcome: PolicyRecordContext = {
        auth: { userId: "test-user" },
        modelUsed: "gpt-4",
        operationType: "text:generate",
        status: "success",
        latencyMs: 1000
      };

      const program = Effect.gen(function* (_) {
        // Create a new instance using the make factory method
        const service = yield* PolicyService.make();
        
        // Record outcome
        yield* service.recordOutcome(testOutcome);
        return true;
      });

      // This should not throw any errors
      const result = await Effect.runPromise(program);
      expect(result).toBe(true);
    });
  });

  describe("PermissivePolicyService implementation", () => {
    const consoleSpy = vi.spyOn(console, "log");

    // Policy check tests
    it("should always allow operations", async () => {
      const testContext: PolicyCheckContext = {
        auth: { userId: "test-user" },
        requestedModel: "gpt-4",
        operationType: "text:generate"
      };

      const program = Effect.gen(function* (_) {
        // Create a new instance using the make factory method
        const service = yield* PermissivePolicyService.make();
        
        // Check policy
        const result = yield* service.checkPolicy(testContext);
        return result;
      });

      const result = await Effect.runPromise(program);
      
      expect(result.allowed).toBe(true);
      expect(result.effectiveModel).toBe(testContext.requestedModel);
    });

    // Record outcome tests
    it("should log outcomes in development", async () => {
      // Save the original NODE_ENV
      const originalEnv = process.env.NODE_ENV;
      
      // Set to development mode for testing
      process.env.NODE_ENV = "development";
      
      const testOutcome: PolicyRecordContext = {
        auth: { userId: "test-user" },
        modelUsed: "gpt-4",
        operationType: "text:generate",
        status: "success",
        latencyMs: 1000
      };

      const program = Effect.gen(function* (_) {
        // Create a new instance using the make factory method
        const service = yield* PermissivePolicyService.make();
        
        // Record outcome
        yield* service.recordOutcome(testOutcome);
        return true;
      });

      await Effect.runPromise(program);
      
      // Check if console.log was called with the expected message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Recorded outcome: success")
      );
      
      // Restore the original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });
  });
});
