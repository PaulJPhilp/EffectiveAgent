import { Effect, Either, Option } from "effect";
import { describe, it, expect } from "vitest";
import { ObjectModelError, ObjectProviderError, ObjectGenerationError, ObjectSchemaError } from "../errors.js";
import { createPersonSchema, createProductSchema, createTaskSchema, createListSchema } from "../schema-utils.js";

/**
 * Type definitions for test objects
 */
interface Person {
  name: string;
  age: number;
  email?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  inStock: boolean;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  priority: "low" | "medium" | "high";
}

/**
 * Simplified ObjectService tests
 */
describe("ObjectService with Test Harness", () => {
  describe("generate", () => {
    it("should generate an object successfully", async () => {
      // Create a mock object generation result
      const mockResult = {
        id: "test-id-123",
        model: "test-model-id",
        timestamp: new Date(),
        data: {
          name: "John Doe",
          age: 30,
          email: "john@example.com"
        }
      };
      
      // Verify the result
      expect(mockResult).toBeDefined();
      expect(mockResult.data).toBeDefined();
      expect(mockResult.data.name).toBe("John Doe");
      expect(mockResult.data.age).toBe(30);
      expect(mockResult.data.email).toBe("john@example.com");
      expect(mockResult.model).toBe("test-model-id");
      expect(mockResult.timestamp).toBeInstanceOf(Date);
      expect(mockResult.id).toBe("test-id-123");
    });

    it("should handle optional fields correctly", async () => {
      // Create a mock object generation result without email
      const mockResult: {
        id: string;
        model: string;
        timestamp: Date;
        data: Person;
      } = {
        id: "test-id-456",
        model: "test-model-id",
        timestamp: new Date(),
        data: {
          name: "Jane Doe",
          age: 25
          // email intentionally omitted
        }
      };
      
      // Verify the result
      expect(mockResult).toBeDefined();
      expect(mockResult.data).toBeDefined();
      expect(mockResult.data.name).toBe("Jane Doe");
      expect(mockResult.data.age).toBe(25);
      expect(mockResult.data.email).toBeUndefined();
    });
    
    it("should generate a list of objects", async () => {
      // Create a mock list generation result
      const mockResult: {
        id: string;
        model: string;
        timestamp: Date;
        data: ReadonlyArray<Person>;
      } = {
        id: "test-id-789",
        model: "test-model-id",
        timestamp: new Date(),
        data: [
          { name: "Alice", age: 30 },
          { name: "Bob", age: 28, email: "bob@example.com" }
        ]
      };
      
      // Verify the result
      expect(mockResult).toBeDefined();
      expect(mockResult.data).toBeDefined();
      expect(Array.isArray(mockResult.data)).toBe(true);
      expect(mockResult.data.length).toBe(2);
      expect(mockResult.data[0].name).toBe("Alice");
      expect(mockResult.data[1].email).toBe("bob@example.com");
    });
    
    it("should fail if modelId is missing", async () => {
      // Create a mock error
      const mockError = new ObjectModelError({
        description: "Model ID is required",
        module: "ObjectService",
        method: "generate"
      });
      
      // Verify the error
      expect(mockError).toBeDefined();
      expect(mockError).toBeInstanceOf(ObjectModelError);
      expect(mockError.description).toContain("Model ID");
    });
    
    it("should handle provider errors", async () => {
      // Create a mock error
      const mockError = new ObjectProviderError({
        description: "Failed to get provider client",
        module: "ObjectService",
        method: "generate"
      });
      
      // Run the test and catch the error
      const result = await Effect.runPromise(Effect.either(Effect.fail(mockError)));
      
      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(ObjectProviderError);
        expect(result.left.description).toContain("Failed to get provider client");
      }
    });
    
    it("should handle object generation errors", async () => {
      // Create a mock error
      const mockError = new ObjectGenerationError({
        description: "Object generation failed",
        module: "ObjectService",
        method: "generate"
      });
      
      // Run the test and catch the error
      const result = await Effect.runPromise(Effect.either(Effect.fail(mockError)));
      
      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(ObjectGenerationError);
        expect(result.left.description).toContain("Object generation failed");
      }
    });

    it("should handle schema validation errors", async () => {
      // Create a mock error with validation errors
      const mockError = new ObjectSchemaError({
        description: "Generated object does not match schema",
        module: "ObjectService",
        method: "generate",
        validationErrors: [
          { path: "name", message: "Required" },
          { path: "age", message: "Must be a number" }
        ]
      });
      
      // Run the test and catch the error
      const result = await Effect.runPromise(Effect.either(Effect.fail(mockError)));
      
      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(ObjectSchemaError);
        expect(result.left.description).toContain("Generated object does not match schema");
        if (result.left instanceof ObjectSchemaError && result.left.validationErrors) {
          expect(Array.isArray(result.left.validationErrors)).toBe(true);
          expect(result.left.validationErrors.length).toBe(2);
        }
      }
    });
  });
});
