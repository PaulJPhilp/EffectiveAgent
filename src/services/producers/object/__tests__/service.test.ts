/**
 * @file Integration tests for ObjectService
 * @module services/pipeline/producers/object/__tests__/service.test
 */

import { randomUUID } from "node:crypto";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import type { EffectiveResponse } from "@/types.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either, Layer, Option, Schema, pipe } from "effect";
import { describe, expect, it } from "vitest";
import {
  ObjectModelError,
  ObjectProviderError
} from "../errors.js";
import { ObjectService } from "../service.js";
import type { ObjectGenerationOptions } from "../types.js";

type SchemaType<S> = S extends Schema.Schema<infer A> ? A : never;

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

// Helper function to create a test response
const createTestResponse = <T>(data: T): EffectiveResponse<T> => ({
  data,
  metadata: {
    id: randomUUID(),
    model: "test-model",
    timestamp: new Date()
  },
  usage: {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0
  },
  finishReason: "stop"
});

describe("ObjectService Integration Tests", () => {
  // Centralized dependency layer configuration
  const testLayer = Layer.provide(
    Layer.mergeAll(
      ConfigurationService.Default,
      ProviderService.Default,
      ModelService.Default,
      ObjectService.Default
    ),
    NodeFileSystem.layer
  );

  // Test setup
  const testModelId = "test-model";
  const testPrompt = "Generate a test person";
  const testSystemPrompt = "You are a helpful assistant.";

  // Helper function to create test options
  const createTestOptions = <S extends Schema.Schema<any>>(
    schema: S,
    overrides: Partial<ObjectGenerationOptions<S>> = {}
  ): ObjectGenerationOptions<S> => ({
    modelId: testModelId,
    prompt: testPrompt,
    system: Option.some(testSystemPrompt),
    schema,
    span: {} as any,
    signal: undefined,
    ...overrides
  });

  it("should generate a valid object", () =>
    Effect.gen(function* () {
      const objectService = yield* ObjectService;
      const options = createTestOptions(PersonSchema);

      const result = yield* pipe(
        objectService.generate(options),
        Effect.map((response: EffectiveResponse<unknown>): EffectiveResponse<Person> => ({
          ...response,
          data: response.data as Person
        }))
      );

      // Validate the response structure
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("metadata");
      expect(result.metadata).toHaveProperty("model");
      expect(typeof result.metadata.model).toBe("string");
      expect(result.metadata).toHaveProperty("id");
      expect(typeof result.metadata.id).toBe("string");

      // Validate the data against the schema
      const decodedPerson = yield* Effect.either(Schema.decode(PersonSchema)(result.data));
      if (Either.isLeft(decodedPerson)) {
        throw new Error("Failed to decode person");
      }
      const person = decodedPerson.right;
      expect(typeof person.name).toBe("string");
      expect(typeof person.age).toBe("number");
    }).pipe(Effect.provide(testLayer))
  );

  it("should handle missing model ID", () =>
    Effect.gen(function* () {
      const objectService = yield* ObjectService;
      const options = createTestOptions(PersonSchema, { modelId: "" });

      const result = yield* pipe(
        objectService.generate(options),
        Effect.either,
        Effect.flatMap((either) => {
          if (Either.isRight(either)) {
            return Effect.fail(new Error("Expected failure but got success"));
          }
          if (!(either.left instanceof ObjectModelError)) {
            return Effect.fail(new Error(`Expected ObjectModelError but got ${either.left?.constructor.name}`));
          }
          return Effect.succeed(either.left);
        })
      );

      expect(result).toBeInstanceOf(ObjectModelError);
      return result;
    }).pipe(Effect.provide(testLayer))
  );

  it("should handle invalid model ID", () =>
    Effect.gen(function* () {
      const objectService = yield* ObjectService;
      const options = createTestOptions(PersonSchema, {
        modelId: "non-existent-model"
      });

      const result = yield* pipe(
        objectService.generate(options),
        Effect.either,
        Effect.flatMap((either) => {
          if (Either.isRight(either)) {
            return Effect.fail(new Error("Expected failure but got success"));
          }
          if (![ObjectModelError, ObjectProviderError].some(ErrorType =>
            either.left instanceof ErrorType
          )) {
            return Effect.fail(new Error(`Expected ObjectModelError or ObjectProviderError but got ${either.left?.constructor.name}`));
          }
          return Effect.succeed(either.left);
        })
      );

      // If we get here, we know it's one of the expected error types
      return result;
    }).pipe(Effect.provide(testLayer))
  );

  it("should handle abort signal", () =>
    Effect.gen(function* () {
      const controller = new AbortController();
      const objectService = yield* ObjectService;

      // Abort immediately
      controller.abort();

      const options = createTestOptions(PersonSchema, {
        signal: controller.signal
      });

      const result = yield* pipe(
        objectService.generate(options),
        Effect.either,
        Effect.flatMap((either) => {
          if (Either.isRight(either)) {
            return Effect.fail(new Error("Expected failure due to abort"));
          }
          // Verify that we got an error
          if (!either.left) {
            return Effect.fail(new Error("Expected an error but got undefined"));
          }
          return Effect.succeed(either.left);
        })
      );

      // If we get here, we know we have an error
      expect(result).toBeDefined();
      return result;
    }).pipe(Effect.provide(testLayer))
  );

  it("should generate a task with all required fields", () =>
    Effect.gen(function* () {
      const objectService = yield* ObjectService;
      const options = createTestOptions(TaskSchema, {
        prompt: "Generate a task for writing tests"
      });

      const result = yield* pipe(
        objectService.generate(options),
        Effect.map((response: EffectiveResponse<unknown>): EffectiveResponse<Task> => ({
          ...response,
          data: response.data as Task
        }))
      );

      // Validate the response structure
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("metadata");
      expect(result.metadata).toHaveProperty("model");
      expect(result.metadata).toHaveProperty("id");

      // Validate the data against the schema
      const decodedTask = yield* Effect.either(Schema.decode(TaskSchema)(result.data));
      if (Either.isLeft(decodedTask)) {
        throw new Error("Failed to decode task");
      }
      const task = decodedTask.right;
      expect(typeof task.id).toBe("string");
      expect(typeof task.title).toBe("string");
      expect(typeof task.completed).toBe("boolean");

      return result;
    }).pipe(Effect.provide(testLayer))
  );
  it("should generate a list of objects", () =>
    Effect.gen(function* () {
      const objectService = yield* ObjectService;
      const ListSchema = Schema.Array(PersonSchema);
      const options = createTestOptions(ListSchema, {
        prompt: "Generate a list of two people"
      });

      const result = yield* pipe(
        objectService.generate(options),
        Effect.map((response: EffectiveResponse<unknown>): EffectiveResponse<Person[]> => ({
          ...response,
          data: response.data as Person[]
        }))
      );

      // Validate the response structure
      expect(result).toHaveProperty("data");
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);

      // Validate each item in the array against the schema
      for (const item of result.data) {
        const decodedItem = yield* pipe(
          Schema.decode(PersonSchema)(item),
          Effect.either,
          Effect.flatMap((either) => {
            if (Either.isLeft(either)) {
              return Effect.fail(new Error("Failed to decode person in array"));
            }
            return Effect.succeed(either.right);
          })
        );

        expect(typeof decodedItem.name).toBe("string");
        expect(typeof decodedItem.age).toBe("number");
      }

      return result;
    }).pipe(Effect.provide(testLayer))
  );
});