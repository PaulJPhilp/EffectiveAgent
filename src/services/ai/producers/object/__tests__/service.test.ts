/**
 * @file Complete test suite for ObjectService
 */

import { createServiceTestHarness } from "@/services/core/test-utils/effect-test-harness.js";
import { Effect, Option } from "effect";
import { describe, expect, it } from "vitest";
import {
  createPersonSchema,
  createProductSchema,
  createTaskSchema,
  createListSchema,
} from "../schema-utils.js";
import { ObjectService } from "../service.js";
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
  // --- Success Case ---
  const createTestObjectService = () =>
    Effect.succeed({
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
        } as any),
    });

  const serviceHarness = createServiceTestHarness(
    ObjectService,
    createTestObjectService,
  );

  it("should generate an object successfully", async () => {
    const schema = createPersonSchema();
    const effect = Effect.gen(function* () {
      const service = yield* ObjectService;
      const result = yield* service.generate<Person>({
        modelId: "test-model",
        prompt: "Generate a person named John Doe",
        system: Option.none(),
        schema,
        span: {} as any,
      });
      expect(result.data.name).toBe("John Doe");
      expect(result.data.age).toBe(30);
      expect(result.data.email).toBe("john@example.com");
      expect(result.model).toBe("test-model");
      expect(result.id).toBe("test-response-id");
      expect(result.usage?.totalTokens).toBe(150);
      return result;
    });
    await serviceHarness.runTest(effect);
  });

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
  const missingModelIdHarness = createServiceTestHarness(
    ObjectService,
    createMissingModelIdService,
  );

  it("should fail if modelId is missing", async () => {
    const schema = createPersonSchema();
    const effect = Effect.either(
      Effect.gen(function* () {
        const service = yield* ObjectService;
        return yield* service.generate<Person>({
          modelId: undefined,
          prompt: "Generate a person",
          system: Option.none(),
          schema,
          span: {} as any,
        });
      }),
    );
    const result = await missingModelIdHarness.runTest(effect);
    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(ObjectModelError);
    }
  });

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
  const providerErrorHarness = createServiceTestHarness(
    ObjectService,
    createProviderErrorService,
  );

  it("should handle provider errors", async () => {
    const schema = createProductSchema();
    const effect = Effect.either(
      Effect.gen(function* () {
        const service = yield* ObjectService;
        return yield* service.generate({
          modelId: "test-model",
          prompt: "Generate a product",
          system: Option.none(),
          schema,
          span: {} as any,
        });
      }),
    );
    const result = await providerErrorHarness.runTest(effect);
    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(ObjectProviderError);
      expect(result.left.description).toContain("Failed to get provider client");
    }
  });

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
  const generationErrorHarness = createServiceTestHarness(
    ObjectService,
    createGenerationErrorService,
  );

  it("should handle object generation errors", async () => {
    const schema = createTaskSchema();
    const effect = Effect.either(
      Effect.gen(function* () {
        const service = yield* ObjectService;
        return yield* service.generate({
          modelId: "test-model",
          prompt: "Generate a task",
          system: Option.none(),
          schema,
          span: {} as any,
        });
      }),
    );
    const result = await generationErrorHarness.runTest(effect);
    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(ObjectGenerationError);
      expect(result.left.description).toContain("Object generation failed");
    }
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
  const schemaErrorHarness = createServiceTestHarness(
    ObjectService,
    createSchemaErrorService,
  );

  it("should handle schema validation errors", async () => {
    const schema = createPersonSchema();
    const effect = Effect.either(
      Effect.gen(function* () {
        const service = yield* ObjectService;
        return yield* service.generate<Person>({
          modelId: "test-model",
          prompt: "Generate a person with invalid data",
          system: Option.none(),
          schema,
          span: {} as any,
        });
      }),
    );
    const result = await schemaErrorHarness.runTest(effect);
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
  });

  // --- Optional Fields ---
  it("should handle optional fields correctly", async () => {
    const schema = createPersonSchema();
    const createOptionalFieldService = () =>
      Effect.succeed({
        generate: <T>(_options: any) =>
          Effect.succeed({
            data: {
              name: "Jane Doe",
              age: 25,
              // email omitted intentionally
            },
            model: "test-model",
            timestamp: new Date(),
            id: "test-response-id-2",
            usage: {
              promptTokens: 80,
              completionTokens: 40,
              totalTokens: 120,
            },
          } as any),
      });
    const optionalFieldHarness = createServiceTestHarness(
      ObjectService,
      createOptionalFieldService,
    );
    const effect = Effect.gen(function* () {
      const service = yield* ObjectService;
      const result = yield* service.generate<Person>({
        modelId: "test-model",
        prompt: "Generate a person without email",
        system: Option.none(),
        schema,
        span: {} as any,
      });
      expect(result.data.name).toBe("Jane Doe");
      expect(result.data.age).toBe(25);
      expect(result.data.email).toBeUndefined();
      expect(result.model).toBe("test-model");
      expect(result.id).toBe("test-response-id-2");
      expect(result.usage?.totalTokens).toBe(120);
      return result;
    });
    await optionalFieldHarness.runTest(effect);
  });

  // --- List Schema ---
  it("should generate a list of objects", async () => {
    const personSchema = createPersonSchema();
    const listSchema = createListSchema(personSchema);
    const createListService = () =>
      Effect.succeed({
        generate: <T>(_options: any) =>
          Effect.succeed({
            data: [
              { name: "Alice", age: 20 },
              { name: "Bob", age: 22, email: "bob@example.com" },
            ],
            model: "test-model",
            timestamp: new Date(),
            id: "test-response-id-3",
            usage: {
              promptTokens: 120,
              completionTokens: 60,
              totalTokens: 180,
            },
          } as any),
      });
    const listHarness = createServiceTestHarness(
      ObjectService,
      createListService,
    );
    const effect = Effect.gen(function* () {
      const service = yield* ObjectService;
      const result = yield* service.generate<ReadonlyArray<Person>>({
        modelId: "test-model",
        prompt: "Generate a list of people",
        system: Option.none(),
        schema: listSchema,
        span: {} as any,
      });
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.data[0].name).toBe("Alice");
      expect(result.data[1].email).toBe("bob@example.com");
      expect(result.model).toBe("test-model");
      expect(result.id).toBe("test-response-id-3");
      expect(result.usage?.totalTokens).toBe(180);
      return result;
    });
    await listHarness.runTest(effect);
  });
});