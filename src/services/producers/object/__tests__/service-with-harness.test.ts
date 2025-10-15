import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either, Option, pipe, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import type { EffectiveResponse } from "@/types.js";
import { ObjectService } from "../service.js";
import type { ObjectGenerationOptions } from "../types.js";

// Define Person type and schema
interface Person {
  name: string;
  age: number;
  email?: string;
}

// Test schemas using Effect Schema
const PersonSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.Number,
  email: Schema.optional(Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)))
});

type PersonSchemaType = Schema.Schema.Type<typeof PersonSchema>;

// Response type for person generation
type PersonGenerationResult = {
  object: Person;
  model: string;
  timestamp: Date;
  id: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

type PersonResponse = EffectiveResponse<PersonGenerationResult>;

type GenerateResult<_T> = Effect.Effect<PersonResponse, Error, never>;

describe("ObjectService Integration Tests", () => {
  // Test setup
  const testModelId = "test-model";
  const testPrompt = "Generate a person";
  const testSystemPrompt = "You are a helpful assistant.";

  // Helper function to create test options
  const createTestOptions = <T extends Schema.Schema<any, any>>(
    schema: T
  ): ObjectGenerationOptions<T> => ({
    modelId: testModelId,
    prompt: testPrompt,
    system: Option.some(testSystemPrompt),
    schema: schema as any, // Type assertion needed due to complex schema types
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
      const response: PersonResponse = yield* pipe(
        objectService.generate(createTestOptions(PersonSchema)),
        Effect.map((r) => r as PersonResponse)
      );

      // Assert the response structure
      expect(response.metadata).toBeDefined();
      expect(response.data).toBeDefined();
      
      const result = response.data as PersonGenerationResult;
      
      // Assert the generated person object
      expect(result).toHaveProperty("object");
      expect(result.object).toHaveProperty("name");
      expect(result.object).toHaveProperty("age");
      expect(typeof result.object.name).toBe("string");
      expect(typeof result.object.age).toBe("number");
      
      if (result.object.email) {
        expect(typeof result.object.email).toBe("string");
        expect(result.object.email).toContain("@");
      }
      
      // Assert the response metadata
      expect(result.model).toBe(testModelId);
      expect(typeof result.id).toBe("string");
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.usage).toBeDefined();
    }).pipe(
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );

    it("should handle optional fields correctly", () =>
      Effect.gen(function* () {
        // Get the service instance
        const objectService = yield* ObjectService;
        
        // Generate the object without email
        const response: PersonResponse = yield* pipe(
          objectService.generate(createTestOptions(PersonSchema)),
          Effect.map((r) => r as PersonResponse)
        );

        // Verify the response
        const result = response.data as PersonGenerationResult;
        expect(result).toBeDefined();
        expect(result.object).toBeDefined();
        expect(result.object.name).toBeDefined();
        expect(result.object.age).toBeDefined();
        
        // Email is optional, so we just verify the required fields
        expect(result.object.name).not.toBe("");
        expect(result.object.age).toBeGreaterThan(0);
      }).pipe(
        Effect.provide(ModelService.Default),
        Effect.provide(ProviderService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      )
    );

    it("should generate a list of objects", () =>
      Effect.gen(function* () {
        // Get the service instance
        const objectService = yield* ObjectService;
        
        // Define array schema
        const PeopleSchema = Schema.Array(PersonSchema);
        
        // Generate the list of objects
        const response: PersonResponse = yield* pipe(
          objectService.generate(createTestOptions(PeopleSchema as any)),
          Effect.map((r) => r as PersonResponse)
        );

        // Verify the response
        const result = response.data as PersonGenerationResult;
        expect(result).toBeDefined();
        
        // Handle both single object and array responses
        const people = Array.isArray(result.object) ? result.object : [result.object];

        // Verify we got at least one person
        expect(people.length).toBeGreaterThan(0);
        
        // Verify each person in the array
        people.forEach((person: Person) => {
          expect(person).toHaveProperty("name");
          expect(person).toHaveProperty("age");
          expect(typeof person.name).toBe("string");
          expect(typeof person.age).toBe("number");
          
          if (person.email) {
            expect(typeof person.email).toBe("string");
            expect(person.email).toContain("@");
          }
        });
      }).pipe(
        Effect.provide(ModelService.Default),
        Effect.provide(ProviderService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      )
    );

    it("should fail if modelId is missing", () =>
      Effect.gen(function* () {
        const objectService = yield* ObjectService;
        
        const result = yield* Effect.either(
          objectService.generate({
            ...createTestOptions(PersonSchema),
            modelId: "", // Empty model ID should trigger validation error
          } as any) // Type assertion needed for testing invalid input
        );

        // Verify the error
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          // Check for either ObjectModelError or ObjectInputError
          const errorName = result.left.constructor.name;
          expect(["ObjectModelError", "ObjectInputError"]).toContain(errorName);
        }
      }).pipe(
        Effect.provide(ModelService.Default),
        Effect.provide(ProviderService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      )
    );

    it("should handle provider errors", () =>
      Effect.gen(function* () {
        const objectService = yield* ObjectService;
        
        // Try to generate with a non-existent model to trigger provider error
        const result = yield* Effect.either(
          objectService.generate({
            ...createTestOptions(PersonSchema),
            modelId: "non-existent-model",
          })
        );

        // Verify the error
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          const errorName = result.left.constructor.name;
          expect(["ObjectProviderError", "ObjectModelError"]).toContain(errorName);
        }
      }).pipe(
        Effect.provide(ModelService.Default),
        Effect.provide(ProviderService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      )
    );

    it("should handle object generation errors", () =>
    Effect.gen(function* () {
      const objectService = yield* ObjectService;
      
      // Test with invalid prompt that might cause generation to fail
      const result = yield* Effect.either(
        objectService.generate({
          ...createTestOptions(PersonSchema),
          prompt: "" // Empty prompt should be rejected
        } as any) // Type assertion needed for testing invalid input
      );

      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const errorName = result.left.constructor.name;
        expect(["ObjectInputError", "ObjectGenerationError"]).toContain(errorName);
      }
    }).pipe(
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("should handle schema validation errors", () =>
    Effect.gen(function* () {
      const objectService = yield* ObjectService;
      
      // Create a schema that will cause validation to fail
      const InvalidPersonSchema = Schema.Struct({
        name: Schema.String,
        // Missing required age field
        email: Schema.optional(Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)))
      });

      const result = yield* Effect.either(
        objectService.generate(
          createTestOptions(InvalidPersonSchema as any) // Type assertion needed for testing
        )
      );

      // Verify the error
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const errorName = result.left.constructor.name;
        expect(["ObjectSchemaError", "ObjectGenerationError"]).toContain(errorName);
      }
    }).pipe(
      Effect.provide(ModelService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );
});
