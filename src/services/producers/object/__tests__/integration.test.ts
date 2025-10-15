/**
 * @file Integration tests for ObjectService
 * @module services/pipeline/producers/object/__tests__/integration.test
 */

import { Effect, Either, Option, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { 
  ObjectGenerationError, 
  ObjectInputError, 
  ObjectModelError
} from "../errors.js";
import { ObjectService } from "../service.js";

// Test schemas
const PersonSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.Number,
  email: Schema.optional(Schema.String),
});

type Person = Schema.Schema.Type<typeof PersonSchema>;

const TaskSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  completed: Schema.Boolean,
  dueDate: Schema.optional(Schema.String),
});

type Task = Schema.Schema.Type<typeof TaskSchema>;

describe("ObjectService Integration Tests", () => {
  // Test setup
  const testModelId = "test-model";
  const testPrompt = "Generate a test person";
  const testSystemPrompt = "You are a helpful assistant.";

    // Helper function to create test options
  const createTestOptions = <T>(schema: Schema.Schema<T>) => ({
    modelId: testModelId,
    prompt: testPrompt,
    system: Option.some(testSystemPrompt),
    schema,
    parameters: {
      temperature: 0.7,
      topP: 0.9,
    },
  });

  it("should generate a valid person object", () =>
    Effect.gen(function* () {
      // Get the service instance
      const objectService = yield* ObjectService;
      
      // Generate the object
      const response = yield* objectService.generate({
        ...createTestOptions(PersonSchema),
        prompt: "Generate a person named John Doe, age 30"
      });

      // Check the response structure
      expect(response).toBeDefined();
      expect(response.data).toBeDefined();
      const person = response.data as Person;
      expect(person.name).toBe("John Doe");
      expect(person.age).toBe(30);
      expect(person.email).toBeUndefined();
      
      // Check metadata
      expect(response.metadata).toBeDefined();
      expect(response.metadata.model).toBe(testModelId);
      expect(response.metadata.provider).toBeDefined();
      expect(response.metadata.schema).toBeDefined();
      expect(response.metadata.promptLength).toBeGreaterThan(0);
      expect(response.metadata.objectSize).toBeGreaterThan(0);
      
      // Check usage
      expect(response.metadata.usage).toBeDefined();
      expect(response.metadata.usage.promptTokens).toBeGreaterThan(0);
      expect(response.metadata.usage.completionTokens).toBeGreaterThan(0);
      expect(response.metadata.usage.totalTokens).toBeGreaterThan(0);
    }).pipe(
      Effect.provide(ObjectService.Default)
    )
  );

  it("should generate a valid task object", () =>
    Effect.gen(function* () {
      // Get the service instance
      const objectService = yield* ObjectService;
      
      // Generate the object
      const response = yield* objectService.generate({
        ...createTestOptions(TaskSchema),
        prompt: "Create a task 'Complete project'"
      });
      
      // Check the response structure
      expect(response).toBeDefined();
      expect(response.data).toBeDefined();
      const task = response.data as Task;
      expect(task.id).toBeDefined();
      expect(task.title).toBe("Complete project");
      expect(task.completed).toBe(false);
      expect(task.dueDate).toBeDefined();
      
      // Check metadata
      expect(response.metadata).toBeDefined();
      expect(response.metadata.model).toBe(testModelId);
      expect(response.metadata.provider).toBeDefined();
      expect(response.metadata.schema).toBeDefined();
      expect(response.metadata.promptLength).toBeGreaterThan(0);
      expect(response.metadata.objectSize).toBeGreaterThan(0);
      
      // Check usage
      expect(response.metadata.usage).toBeDefined();
      expect(response.metadata.usage.promptTokens).toBeGreaterThan(0);
      expect(response.metadata.usage.completionTokens).toBeGreaterThan(0);
      expect(response.metadata.usage.totalTokens).toBeGreaterThan(0);
    }).pipe(
      Effect.provide(ObjectService.Default)
    )
  );

  it("should handle empty prompt error", () =>
    Effect.gen(function* () {
      const objectService = yield* ObjectService;
      
      const result = yield* Effect.either(
        objectService.generate({
          ...createTestOptions(PersonSchema),
          prompt: ""
        })
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left as ObjectInputError;
        expect(error).toBeInstanceOf(ObjectInputError);
        expect(error.message).toContain("Prompt cannot be empty");
        expect(error.module).toBe("ObjectService");
        expect(error.method).toBe("generate");
      }
    }).pipe(
      Effect.provide(ObjectService.Default)
    )
  );

  it("should handle missing model ID error", () =>
    Effect.gen(function* () {
      const objectService = yield* ObjectService;
      
      const result = yield* Effect.either(
        objectService.generate({
          ...createTestOptions(PersonSchema),
          modelId: ""
        })
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left as ObjectModelError;
        expect(error).toBeInstanceOf(ObjectModelError);
        expect(error.message).toContain("Model ID must be provided");
        expect(error.module).toBe("ObjectService");
        expect(error.method).toBe("generate");
      }
    }).pipe(
      Effect.provide(ObjectService.Default)
    )
  );

  it("should handle abort signal", () =>
    Effect.gen(function* () {
      const controller = new AbortController();
      const objectService = yield* ObjectService;
      
      // Abort immediately
      controller.abort();
      
      const result = yield* Effect.either(
        objectService.generate({
          ...createTestOptions(PersonSchema),
          signal: controller.signal,
          prompt: "This should be aborted"
        })
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left as ObjectGenerationError;
        expect(error).toBeInstanceOf(ObjectGenerationError);
        expect(error.message).toContain("aborted");
        expect(error.module).toBe("ObjectService");
        expect(error.method).toBe("generate");
      }
    }).pipe(
      Effect.provide(ObjectService.Default)
    )
  );
});
