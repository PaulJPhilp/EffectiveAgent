/**
 * Tests for the context-management utility functions.
 * 
 * These tests demonstrate how to use the resource management utilities
 * and validate that they work as expected.
 */

import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";
import { withResource } from "../context-management.js";

describe("context-management utilities", () => {
  describe("withResource", () => {
    it("should properly set up and tear down a resource", async () => {
      // Create spies to verify setup and teardown
      const setupSpy = vi.fn();
      const teardownSpy = vi.fn();
      const useSpy = vi.fn();

      // Define a resource
      type TestResource = { id: string; value: number };

      // Create setup, use, and teardown functions
      const setup = Effect.sync(() => {
        setupSpy();
        return { id: "test", value: 42 } as TestResource;
      });

      const teardown = (resource: TestResource) => Effect.sync(() => {
        teardownSpy(resource);
      });

      const use = (resource: TestResource) => Effect.sync(() => {
        useSpy(resource);
        return `Used resource: ${resource.id}`;
      });

      // Use the withResource utility
      const program = withResource(setup, teardown)(use);

      // Run the program
      const result = await Effect.runPromise(program);

      // Verify the result and that setup, use, and teardown were called in order
      expect(result).toBe("Used resource: test");
      expect(setupSpy).toHaveBeenCalledTimes(1);
      expect(useSpy).toHaveBeenCalledTimes(1);
      expect(useSpy).toHaveBeenCalledWith({ id: "test", value: 42 });
      expect(teardownSpy).toHaveBeenCalledTimes(1);
      expect(teardownSpy).toHaveBeenCalledWith({ id: "test", value: 42 });
    });

    it("should tear down the resource even if use throws an error", async () => {
      // Create spies to verify setup and teardown
      const setupSpy = vi.fn();
      const teardownSpy = vi.fn();

      // Define a resource
      type TestResource = { id: string; value: number };

      // Create setup, use, and teardown functions
      const setup = Effect.sync(() => {
        setupSpy();
        return { id: "test", value: 42 } as TestResource;
      });

      const teardown = (resource: TestResource) => Effect.sync(() => {
        teardownSpy(resource);
      });

      const use = (resource: TestResource) => Effect.fail(
        new Error("Test error")
      );

      // Use the withResource utility
      const program = withResource(setup, teardown)(use);

      // Run the program and assert the error
      const result = await Effect.runPromise(Effect.either(program));

      // Verify that setup and teardown were called, even though use failed
      expect(setupSpy).toHaveBeenCalledTimes(1);
      expect(teardownSpy).toHaveBeenCalledTimes(1);
      expect(teardownSpy).toHaveBeenCalledWith({ id: "test", value: 42 });

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        const error = result.left;
        expect(error).toBeInstanceOf(Error);
        // TSC issue: `error` is `unknown` without explicit cast after `toBeInstanceOf` sometimes
        // Safely access message after confirming it's an Error instance
        if (error instanceof Error) {
          expect(error.message).toBe("Test error");
        }
      }
    });
  });
});
