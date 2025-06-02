/**
 * @file Integration tests for ObjectService
 * @module services/pipeline/producers/object/__tests__/integration.test
 */

import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Option, pipe } from "effect";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { 
  ObjectInputError, 
  ObjectModelError
} from "../errors.js";
import { ObjectService } from "../service.js";
import { ObjectGenerationOptions } from "../types.js";

// Import EffectiveResponse type
import type { EffectiveResponse } from "@/types.js";

// Helper type for the expected response structure
type ObjectServiceResponse<T> = Effect.Effect<EffectiveResponse<T>>;

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
      expect(response).toHaveProperty("data");
      expect(response.data).toHaveProperty("name", "John Doe");
      expect(response.data).toHaveProperty("age", 30);
      expect(response.data).not.toHaveProperty("email");
      
      // Check metadata
      expect(response).toHaveProperty("metadata");
      expect(response.metadata).toHaveProperty("model", testModelId);
      expect(response.metadata).toHaveProperty("id");
      expect(response.metadata).toHaveProperty("timestamp");
      
      // Check usage if present
      if (response.usage) {
        expect(response.usage).toMatchObject({
          promptTokens: expect.any(Number),
          completionTokens: expect.any(Number),
          totalTokens: expect.any(Number)
        });
      }
    }).pipe(
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("should generate a valid task object", () =>
    Effect.gen(function* () {
      // Get the service instance
      const objectService = yield* ObjectService;
      
      // Generate the object with proper typing
      const response = yield* pipe(
        objectService.generate({
          ...createTestOptions(TaskSchema),
          prompt: "Create a task 'Complete project'"
        }),
        Effect.map((res) => {
          const typedRes = res as EffectiveResponse<Task>;
          // Verify the response structure
          expect(typedRes).toHaveProperty("data");
          const responseData = typedRes.data as any; // Type assertion for test assertions
          expect(responseData).toHaveProperty("title", "Complete project");
          expect(typeof responseData.completed).toBe("boolean");
          expect(responseData).toHaveProperty("id");
          
          // Check metadata
          expect(typedRes).toHaveProperty("metadata");
          expect(typedRes.metadata).toHaveProperty("model", testModelId);
          expect(typedRes.metadata).toHaveProperty("id");
          expect(typedRes.metadata).toHaveProperty("timestamp");
          
          // Check usage if present
          if (typedRes.usage) {
            expect(typedRes.usage).toMatchObject({
              promptTokens: expect.any(Number),
              completionTokens: expect.any(Number),
              totalTokens: expect.any(Number)
            });
          }
          
          return typedRes;
        })
      );
      
      return response;
    }).pipe(
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
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

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ObjectInputError);
        expect(result.left.message).toContain("Prompt cannot be empty");
      }
    }).pipe(
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
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

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ObjectModelError);
        expect(result.left.message).toContain("Model ID must be provided");
      }
    }).pipe(
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
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

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect([
          "AbortError",
          "ObjectGenerationError"
        ]).toContain(result.left.constructor.name);
      }
    }).pipe(
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );
});
