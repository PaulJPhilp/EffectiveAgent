/**
 * @file Complete test suite for ObjectService
 */


import { Effect, Option } from "effect";
import { describe, expect, it } from "vitest";
import {
  createPersonSchema,
  createProductSchema,
  createTaskSchema,
  createListSchema,
} from "../schema-utils.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ObjectService } from "../service.js";
import type { ObjectServiceApi } from "../api.js";
import {
  ObjectModelError,
  ObjectProviderError,
  ObjectGenerationError,
  ObjectSchemaError,
} from "../errors.js";

interface Person {
  name: string;
  age: number;
  email?: string;
}

describe("ObjectService", () => {
  it("should handle abort signal", () =>
    Effect.gen(function* () {
      const controller = new AbortController();
      const schema = createPersonSchema();
      const options = {
        modelId: "test-model",
        prompt: "Generate a person",
        system: Option.none(),
        schema,
        span: {} as any,
        signal: controller.signal
      };

      // Abort after a short delay
      setTimeout(() => controller.abort(), 100);

      // The operation should be aborted
      const objectService = yield* ObjectService;
      const result = yield* objectService.generate<Person>(options);
      return result;
    })
  );

  // --- Success Case ---
  const mockImplementation = {
    generate: <T>(_options: any) =>
      Effect.succeed({
        data: {
          name: "John Doe",
          age: 30,
          email: "john@example.com",
        },
        model: "test-model",
        timestamp: new Date(),
        id: "test-response-id",
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
      } as any)
  };
  it("should generate an object successfully", () =>
    Effect.gen(function* () {
      const objectService = yield* ObjectService;
      const result = yield* objectService.generate<Person>({
        modelId: "test-model",
        prompt: "Generate a person named John Doe",
        system: Option.none(),
        schema: createPersonSchema(),
        span: {} as any,
        signal: undefined,
      });

      expect(result.data.name).toBe("John Doe");
      expect(result.data.age).toBe(30);
      expect(result.data.email).toBe("john@example.com");
      expect(result.model).toBe("test-model");
      expect(result.id).toBe("test-response-id");
      expect(result.usage?.totalTokens).toBe(150);
      return result;
    }).pipe(
      Effect.provideService(ObjectService, mockImplementation )
    )
  );

  // --- Missing modelId ---
  const createMissingModelIdService = () =>
    Effect.succeed({
      generate: <T>(_options: any) =>
        Effect.fail(
          new ObjectModelError({
            description: "Model ID must be provided",
            module: "ObjectService",
            method: "generate",
          }),
        ),
    });
  const mockMissingModelIdImpl = {
    generate: <T>(_options: any) =>
      Effect.fail(
        new ObjectModelError({
          description: "Model ID must be provided",
          module: "ObjectService",
          method: "generate",
        }),
      ),
  };

  it("should fail if modelId is missing", () =>
    Effect.gen(function* () {
      const service = yield* ObjectService;
      const result = yield* Effect.either(
        service.generate<Person>({
          modelId: undefined,
          prompt: "Generate a person with missing model ID",
          system: Option.none(),
          schema: createPersonSchema(),
          span: {} as any,
        })
      )

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ObjectModelError);
      }
    })
  );

  // --- Provider Error ---
  const createProviderErrorService = () =>
    Effect.succeed({
      generate: <T>(_options: any) =>
        Effect.fail(
          new ObjectProviderError({
            description: "Failed to get provider client",
            module: "ObjectService",
            method: "generate",
            cause: new Error("Provider unavailable"),
          }),
        ),
    });
  const mockProviderErrorImpl = {
    generate: <T>(_options: any) =>
      Effect.fail(
        new ObjectProviderError({
          description: "Failed to get provider client",
          module: "ObjectService",
          method: "generate",
          cause: new Error("Provider unavailable"),
        }),
      ),
  };

  it("should handle provider errors", () =>
    Effect.gen(function* () {
      const service = yield* ObjectService;
      const result = yield* Effect.either(
        service.generate({
          modelId: "test-model",
          prompt: "Generate a product with provider error",
          system: Option.none(),
          schema: createProductSchema(),
          span: {} as any,
        })
      )

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ObjectProviderError);
        expect(result.left.description).toContain("Failed to get provider client");
      }
    })
  );

  // --- Generation Error ---
  const createGenerationErrorService = () =>
    Effect.succeed({
      generate: <T>(_options: any) =>
        Effect.fail(
          new ObjectGenerationError({
            description: "Object generation failed",
            module: "ObjectService",
            method: "generate",
            cause: new Error("Timeout"),
          }),
        ),
    });
  const mockGenerationErrorImpl = {
    generate: <T>(_options: any) =>
      Effect.fail(
        new ObjectGenerationError({
          description: "Object generation failed",
          module: "ObjectService",
          method: "generate",
        }),
      ),
  };

  it("should handle object generation errors", () =>
    Effect.gen(function* () {
      const service = yield* ObjectService;
      const result = yield* Effect.either(
        service.generate({
          modelId: "test-model",
          prompt: "Generate a task with generation error",
          system: Option.none(),
          schema: createTaskSchema(),
          span: {} as any,
        })
      )

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ObjectGenerationError);
        expect(result.left.description).toContain("Object generation failed");
      }
    })
  );
  });

  // --- Schema Validation Error ---
  const createSchemaErrorService = () =>
    Effect.succeed({
      generate: <T>(_options: any) =>
        Effect.fail(
          new ObjectSchemaError({
            description: "Generated object does not match schema",
            module: "ObjectService",
            method: "generate",
            schema: createPersonSchema(),
            result: { name: 123, age: "thirty" },
            validationErrors: [
              { message: "name must be string" },
              { message: "age must be number" },
            ],
          }),
        ),
    });
  const mockSchemaErrorImpl = {
    generate: <T>(_options: any) =>
      Effect.fail(
        new ObjectSchemaError({
          description: "Generated object does not match schema",
          module: "ObjectService",
          method: "generate",
          validationErrors: [],
        }),
      ),
  };
  it("should handle schema validation errors", () =>
    Effect.gen(function* () {
      const service = yield* ObjectService;
      const result = yield* Effect.either(
        service.generate<Person>({
          modelId: "test-model",
          prompt: "Generate a person with invalid data",
          system: Option.none(),
          schema: createPersonSchema(),
          span: {} as any,
        })
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ObjectSchemaError);
        expect(result.left.description).toContain(
          "Generated object does not match schema",
        );
        if (result.left instanceof ObjectSchemaError) {
          expect(Array.isArray(result.left.validationErrors)).toBe(true);
        }
      }
      return result;
    })
  );

  // --- Optional Fields ---
  it("should handle optional fields correctly", () =>
    Effect.gen(function* () {
      const objectService = yield* ObjectService;
      const result = yield* objectService.generate<Person>({
        modelId: "test-model",
        prompt: "Generate a person without email",
        system: Option.none(),
        schema: createPersonSchema(),
        span: {} as any,
      });
      expect(result.data.name).toBe("Jane Doe");
      expect(result.data.age).toBe(25);
      expect(result.data.email).toBeUndefined();
      expect(result.model).toBe("test-model");
      expect(result.id).toBe("test-response-id-2");
      expect(result.usage?.totalTokens).toBe(120);
      return result;
    })
  );

  // --- List Schema ---
  it("should generate a list of objects", () =>
    Effect.gen(function* () {
      const objectService = yield* ObjectService;
      const result = yield* objectService.generate<ReadonlyArray<Person>>({
        modelId: "test-model",
        prompt: "Generate a list of people",
        system: Option.none(),
        schema: createListSchema(createPersonSchema()),
        span: {} as any,
      });

      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.data[0].name).toBe("Alice");
      expect(result.data[0].age).toBe(25);
      expect(result.data[1].name).toBe("Bob");
      expect(result.data[1].age).toBe(30);
      expect(result.model).toBe("test-model");
      expect(result.id).toBe("test-response-id");
      expect(result.usage?.totalTokens).toBe(150);
      
      return result;
    }).pipe(
      Effect.provideService(ObjectService, {
        generate: <T>(_options: any) =>
          Effect.succeed({
            data: [
              { name: "Alice", age: 25 },
              { name: "Bob", age: 30 }
            ],
            model: "test-model",
            timestamp: new Date(),
            id: "test-response-id",
            usage: {
              promptTokens: 100,
              completionTokens: 50,
              totalTokens: 150,
            },
          } as any)
      })
    )
  );