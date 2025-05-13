import { CacheService, CacheServiceApi } from "@/ea/pipelines/structured-output/cache.js";
import { GenerationError, SchemaValidationError } from "@/ea/pipelines/structured-output/errors.js";
import { GenerateObjectResult } from "@/services/ai/provider/types.js";
import { createTypedMock } from "@/services/core/test-harness/utils/typed-mocks.js";
import type { ObjectServiceApi } from "@/services/pipeline/producers/object/api.js";
import { ObjectService } from "@/services/pipeline/producers/object/service.js";
import * as S from "@effect/schema/Schema";
import { Context, Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StructuredOutputPipeline } from "../structured-output.js";

// Test schemas
const Person = S.Struct({
    name: S.String,
    age: S.Number,
    email: S.String
}) as S.Schema<any>;

const ComplexObject = S.Struct({
    id: S.String,
    data: S.Array(Person),
    metadata: S.Struct({
        createdAt: S.String,
        tags: S.Array(S.String)
    })
}) as S.Schema<any>;

describe("StructuredOutputPipeline", () => {
    // Mock services
    let mockObjectService: ObjectServiceApi;
    let mockCacheService: CacheServiceApi;
    let testContext: Context.Context<ObjectServiceApi | CacheServiceApi>;

    beforeEach(() => {
        // Reset mocks before each test
        mockObjectService = createTypedMock<ObjectServiceApi>({
            generate: vi.fn()
        });

        mockCacheService = createTypedMock<CacheServiceApi>({
            get: vi.fn(),
            set: vi.fn(),
            invalidate: vi.fn(),
            clear: vi.fn(),
            generateKey: vi.fn(),
            _tag: "CacheService"
        });

        testContext = Context.empty().pipe(
            Context.add(ObjectService, mockObjectService),
            Context.add(CacheService, mockCacheService)
        );
    });

    describe("Basic functionality", () => {
        it("should generate simple structured output successfully", async () => {
            const mockPerson = {
                name: "John Doe",
                age: 30,
                email: "john@example.com"
            };

            vi.mocked(mockObjectService.generate).mockImplementation(() =>
                Effect.succeed({
                    object: mockPerson,
                    model: "test-model",
                    timestamp: new Date(),
                    id: "test-id",
                    finishReason: "stop",
                    usage: {
                        promptTokens: 10,
                        completionTokens: 20,
                        totalTokens: 30
                    }
                } as GenerateObjectResult<typeof mockPerson>)
            );

            const pipeline = new StructuredOutputPipeline<typeof Person>(Person);
            const result = await Effect.runPromise(
                pipeline.run({
                    prompt: "Generate a person object",
                    modelId: "test-model",
                    systemPrompt: "You are an AI assistant that generates structured data."
                }).pipe(Effect.provide(testContext))
            );

            expect(result.data).toEqual(mockPerson);
            expect(result.usage.totalTokens).toBe(30);
        });

        it("should handle complex nested objects", async () => {
            const mockData = {
                id: "123",
                data: [
                    { name: "John", age: 30, email: "john@example.com" },
                    { name: "Jane", age: 25, email: "jane@example.com" }
                ],
                metadata: {
                    createdAt: "2024-03-20T12:00:00Z",
                    tags: ["test", "example"]
                }
            };

            vi.mocked(mockObjectService.generate).mockImplementation(() =>
                Effect.succeed({
                    object: mockData,
                    model: "test-model",
                    timestamp: new Date(),
                    id: "test-id",
                    finishReason: "stop",
                    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
                } as GenerateObjectResult<typeof mockData>)
            );

            const pipeline = new StructuredOutputPipeline<typeof ComplexObject>(ComplexObject);
            const result = await Effect.runPromise(
                pipeline.run({
                    prompt: "Generate a complex object",
                    modelId: "test-model"
                }).pipe(Effect.provide(testContext))
            );

            expect(result.data).toEqual(mockData);
        });
    });

    describe("Error handling", () => {
        it("should handle validation errors", async () => {
            const invalidData = {
                name: "John Doe",
                age: "30", // Should be number
                email: "john@example.com"
            };

            vi.mocked(mockObjectService.generate).mockImplementation(() =>
                Effect.fail(new SchemaValidationError({
                    message: "Invalid data type",
                    validationIssues: ["age must be a number"],
                    invalidValue: invalidData,
                    schemaPath: "age"
                }))
            );

            const pipeline = new StructuredOutputPipeline<typeof Person>(Person);
            const result = await Effect.runPromiseExit(
                pipeline.run({
                    prompt: "Generate a person object",
                    modelId: "test-model"
                }).pipe(Effect.provide(testContext))
            );

            expect(result._tag).toBe("Failure");
            if (result._tag === "Failure") {
                const error = result.cause;
                expect(error).toBeInstanceOf(SchemaValidationError);
                expect((error as SchemaValidationError).validationIssues).toContain("age must be a number");
            }
        });

        it("should handle generation errors", async () => {
            vi.mocked(mockObjectService.generate).mockImplementation(() =>
                Effect.fail(new GenerationError({
                    message: "Model failed to generate output",
                    modelId: "test-model",
                    prompt: "Generate a person object",
                    usage: {
                        promptTokens: 10,
                        completionTokens: 0,
                        totalTokens: 10
                    }
                }))
            );

            const pipeline = new StructuredOutputPipeline<typeof Person>(Person);
            const result = await Effect.runPromiseExit(
                pipeline.run({
                    prompt: "Generate a person object",
                    modelId: "test-model"
                }).pipe(Effect.provide(testContext))
            );

            expect(result._tag).toBe("Failure");
            if (result._tag === "Failure") {
                const error = result.cause;
                expect(error).toBeInstanceOf(GenerationError);
                expect((error as GenerationError).modelId).toBe("test-model");
            }
        });
    });

    describe("Edge cases", () => {
        it("should handle empty arrays", async () => {
            const EmptyArraySchema = S.Struct({
                items: S.Array(Person)
            });

            const mockData = {
                items: []
            };

            vi.mocked(mockObjectService.generate).mockImplementation(() =>
                Effect.succeed({
                    object: mockData,
                    model: "test-model",
                    timestamp: new Date(),
                    id: "test-id",
                    finishReason: "stop",
                    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
                } as GenerateObjectResult<typeof mockData>)
            );

            const pipeline = new StructuredOutputPipeline<typeof EmptyArraySchema>(EmptyArraySchema);
            const result = await Effect.runPromise(
                pipeline.run({
                    prompt: "Generate an empty array",
                    modelId: "test-model"
                }).pipe(Effect.provide(testContext))
            );

            expect(result.data.items).toEqual([]);
        });

        it("should handle optional fields", async () => {
            const OptionalSchema = S.Struct({
                required: S.String,
                optional: S.Optional(S.Number)
            });

            const mockData = {
                required: "test",
                optional: 42
            };

            vi.mocked(mockObjectService.generate).mockImplementation(() =>
                Effect.succeed({
                    object: mockData,
                    model: "test-model",
                    timestamp: new Date(),
                    id: "test-id",
                    finishReason: "stop",
                    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
                } as GenerateObjectResult<typeof mockData>)
            );

            const pipeline = new StructuredOutputPipeline<typeof OptionalSchema>(OptionalSchema);
            const result = await Effect.runPromise(
                pipeline.run({
                    prompt: "Generate with optional field",
                    modelId: "test-model"
                }).pipe(Effect.provide(testContext))
            );

            expect(result.data.required).toBe("test");
            expect(result.data.optional).toBeUndefined();
        });

        it("should handle maximum token limits", async () => {
            const pipeline = new StructuredOutputPipeline<typeof Person>(Person);
            const result = await Effect.runPromise(
                pipeline.run({
                    prompt: "Generate a person object",
                    modelId: "test-model",
                    maxTokens: 100
                }).pipe(Effect.provide(testContext))
            );

            expect(vi.mocked(mockObjectService.generate)).toHaveBeenCalledWith(
                expect.objectContaining({
                    parameters: expect.objectContaining({
                        maxSteps: 100
                    })
                })
            );
        });
    });

    describe("Caching", () => {
        it("should return cached result when available", async () => {
            const cachedPerson = {
                name: "John Doe",
                age: 30,
                email: "john@example.com"
            };

            vi.mocked(mockCacheService.get).mockImplementation(() =>
                Effect.succeed(cachedPerson)
            );

            const pipeline = new StructuredOutputPipeline<typeof Person>(Person);
            const result = await Effect.runPromise(
                pipeline.run({
                    prompt: "Generate a person object",
                    modelId: "test-model"
                }).pipe(Effect.provide(testContext))
            );

            expect(result.data).toEqual(cachedPerson);
            expect(mockObjectService.generate).not.toHaveBeenCalled();
        });

        it("should cache successful generation results", async () => {
            const generatedPerson = {
                name: "Jane Doe",
                age: 25,
                email: "jane@example.com"
            };

            vi.mocked(mockCacheService.get).mockImplementation(() =>
                Effect.succeed(null)
            );

            vi.mocked(mockObjectService.generate).mockImplementation(() =>
                Effect.succeed({
                    object: generatedPerson,
                    model: "test-model",
                    timestamp: new Date(),
                    id: "test-id",
                    finishReason: "stop",
                    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
                } as GenerateObjectResult<typeof generatedPerson>)
            );

            const pipeline = new StructuredOutputPipeline<typeof Person>(Person);
            await Effect.runPromise(
                pipeline.run({
                    prompt: "Generate a person object",
                    modelId: "test-model"
                }).pipe(Effect.provide(testContext))
            );

            expect(mockCacheService.set).toHaveBeenCalledWith(
                expect.any(String),
                generatedPerson
            );
        });

        it("should not cache failed generation attempts", async () => {
            vi.mocked(mockCacheService.get).mockImplementation(() =>
                Effect.succeed(null)
            );

            vi.mocked(mockObjectService.generate).mockImplementation(() =>
                Effect.fail(new GenerationError({
                    message: "Generation failed",
                    modelId: "test-model",
                    prompt: "Generate a person object"
                }))
            );

            const pipeline = new StructuredOutputPipeline<typeof Person>(Person);
            await Effect.runPromiseExit(
                pipeline.run({
                    prompt: "Generate a person object",
                    modelId: "test-model"
                }).pipe(Effect.provide(testContext))
            );

            expect(mockCacheService.set).not.toHaveBeenCalled();
        });

        it("should use different cache keys for different schemas", async () => {
            const cachedKeys = new Set<string>();

            vi.mocked(mockCacheService.get).mockImplementation(() =>
                Effect.succeed(null)
            );

            vi.mocked(mockCacheService.set).mockImplementation((key: string) => {
                cachedKeys.add(key);
                return Effect.unit;
            });

            vi.mocked(mockObjectService.generate).mockImplementation(() =>
                Effect.succeed({
                    object: { name: "Test" },
                    model: "test-model",
                    timestamp: new Date(),
                    id: "test-id",
                    finishReason: "stop",
                    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
                } as GenerateObjectResult)
            );

            const pipeline1 = new StructuredOutputPipeline<typeof Person>(Person);
            const pipeline2 = new StructuredOutputPipeline<typeof ComplexObject>(ComplexObject);

            await Effect.runPromise(
                Effect.all([
                    pipeline1.run({
                        prompt: "Generate a person",
                        modelId: "test-model"
                    }),
                    pipeline2.run({
                        prompt: "Generate a complex object",
                        modelId: "test-model"
                    })
                ]).pipe(Effect.provide(testContext))
            );

            expect(cachedKeys.size).toBe(2);
        });
    });
});