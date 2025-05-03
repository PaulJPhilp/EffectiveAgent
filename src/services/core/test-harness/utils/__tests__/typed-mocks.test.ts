/**
 * Tests for the typed-mocks utility functions.
 * 
 * These tests demonstrate how to use the type-safe mock utilities
 * and validate that they work as expected.
 */

import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import { 
  createMinimalMock,
  createServiceError,
  createTypedMock,
  hasRequiredProperties,
  mockFailure,
  mockSuccess
} from "../typed-mocks.js";

// Define a sample interface for testing
interface TestService {
  getData: (id: string) => Effect.Effect<{ id: string; value: string }, Error>;
  processItem: (item: { name: string; count: number }) => Effect.Effect<boolean>;
  readonly config: {
    timeout: number;
    retries: number;
  };
}

// Define a sample error class for testing
class TestError extends Error {
  constructor(public readonly code: number, message: string) {
    super(message);
    this.name = "TestError";
  }
}

describe("typed-mocks utilities", () => {
  describe("createTypedMock", () => {
    it("should create a mock that conforms to the interface", () => {
      // Create a mock with default implementation
      const mockService = createTypedMock<TestService>({
        getData: (id) => Effect.succeed({ id, value: "test" }),
        processItem: () => Effect.succeed(true),
        config: {
          timeout: 1000,
          retries: 3
        }
      });

      // Verify the mock has the expected structure
      expect(mockService).toHaveProperty("getData");
      expect(mockService).toHaveProperty("processItem");
      expect(mockService).toHaveProperty("config");
      expect(mockService.config).toHaveProperty("timeout", 1000);
      expect(mockService.config).toHaveProperty("retries", 3);
    });

    it("should allow overriding specific properties", () => {
      // Create a base mock
      const baseMock = {
        getData: (id: string) => Effect.succeed({ id, value: "default" }),
        processItem: () => Effect.succeed(true),
        config: {
          timeout: 1000,
          retries: 3
        }
      };

      // Create a mock with overrides
      const mockService = createTypedMock<TestService>(
        baseMock,
        {
          getData: (id) => Effect.succeed({ id, value: "override" }),
          config: {
            timeout: 2000,
            retries: 5
          }
        }
      );

      // Verify the overrides were applied
      expect(mockService.config.timeout).toBe(2000);
      expect(mockService.config.retries).toBe(5);
    });
  });

  describe("mockSuccess", () => {
    it("should create an Effect that succeeds with the provided value", async () => {
      // Create a mock success Effect
      const effect = mockSuccess("test-value");
      
      // Run the Effect and verify it succeeds with the expected value
      const result = await Effect.runPromise(Effect.either(effect));
      
      expect(Either.isRight(result)).toBe(true);
      if (Either.isRight(result)) {
        expect(result.right).toBe("test-value");
      }
    });
  });

  describe("mockFailure", () => {
    it("should create an Effect that fails with the provided error", async () => {
      // Create a mock error
      const error = new Error("test-error");
      
      // Create a mock failure Effect
      const effect = mockFailure(error);
      
      // Run the Effect and verify it fails with the expected error
      const result = await Effect.runPromise(Effect.either(effect));
      
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBe(error);
        expect(result.left.message).toBe("test-error");
      }
    });
  });

  describe("createServiceError", () => {
    it("should create a type-safe error instance", () => {
      // Create a test error
      const error = createServiceError(TestError, 404, "Not Found");
      
      // Verify the error has the expected properties
      expect(error).toBeInstanceOf(TestError);
      expect(error.code).toBe(404);
      expect(error.message).toBe("Not Found");
    });
  });

  describe("createMinimalMock", () => {
    it("should create a minimal mock with only the specified properties", () => {
      // Define a type with required properties
      interface User {
        id: string;
        name: string;
        email: string;
        role: string;
        createdAt: Date;
      }
      
      // Create a minimal mock with only some properties
      const mockUser = createMinimalMock<User>({
        id: "user-123",
        name: "Test User"
      });
      
      // Verify the mock has only the specified properties
      expect(mockUser.id).toBe("user-123");
      expect(mockUser.name).toBe("Test User");
      
      // TypeScript allows access to other properties, but they'll be undefined
      // This is a limitation of type assertions, but it's useful for testing
      expect(mockUser.email).toBeUndefined();
    });
  });

  describe("hasRequiredProperties", () => {
    it("should return true for objects with all required properties", () => {
      // Create a test object
      const obj = {
        id: "test-id",
        name: "test-name",
        value: 123
      };
      
      // Check if the object has the required properties
      const result = hasRequiredProperties<{ id: string; name: string }>(
        obj,
        ["id", "name"]
      );
      
      expect(result).toBe(true);
    });

    it("should return false for objects missing required properties", () => {
      // Create a test object missing a required property
      const obj = {
        id: "test-id"
      };
      
      // Check if the object has the required properties
      const result = hasRequiredProperties<{ id: string; name: string }>(
        obj,
        ["id", "name"]
      );
      
      expect(result).toBe(false);
    });

    it("should return false for non-object values", () => {
      // Check various non-object values
      expect(hasRequiredProperties(null, ["id"])).toBe(false);
      expect(hasRequiredProperties(undefined, ["id"])).toBe(false);
      expect(hasRequiredProperties("string", ["id"])).toBe(false);
      expect(hasRequiredProperties(123, ["id"])).toBe(false);
      expect(hasRequiredProperties(true, ["id"])).toBe(false);
    });
  });
});
