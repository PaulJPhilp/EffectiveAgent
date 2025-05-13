import { GenerateObjectResult } from "@/services/ai/provider/types.js";
import type { ObjectServiceApi } from "@/services/pipeline/producers/object/api.js";
import { ObjectService } from "@/services/pipeline/producers/object/service.js";
import { Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { StructuredOutputPipeline } from "../structured-output.js";

// Test type definitions
interface Person {
    name: string;
    age: number;
    email: string;
}

interface ComplexObject {
    id: string;
    data: Person[];
    metadata: {
        createdAt: string;
        updatedAt: string;
    };
}

interface EmptyArray {
    items: Person[];
}

interface Optional {
    required: string;
    optional?: number;
}

// WARNING: DO NOT MODIFY THESE SCHEMAS!
// These Schema definitions use the correct Effect 3.14+ pattern with uppercase Schema methods
// (Schema.Struct, Schema.String, Schema.Number, Schema.Array)
// DO NOT change the casing or structure of these schemas!

// WARNING: DO NOT MODIFY THESE SCHEMAS!
// These Schema definitions use the correct Effect 3.14+ pattern with uppercase Schema methods
// (Schema.Struct, Schema.String, Schema.Number, Schema.Array)
// DO NOT change the casing or structure of these schemas!
// DO NOT add unnecessary "as Schema.Schema<T>" type assertions!
// If you think there's an error here, you're probably wrong.

// Schema definitions
const PersonSchema = Schema.Struct({
    name: Schema.String,
    age: Schema.Number,
    email: Schema.String
}) as Schema.Schema<any>;

const ComplexObjectSchema = Schema.Struct({
    id: Schema.String,
    data: Schema.Array(PersonSchema),
    metadata: Schema.Struct({
        createdAt: Schema.String,
        updatedAt: Schema.String
    })
}) as Schema.Schema<any>;

const EmptyArraySchema = Schema.Struct({
    items: Schema.Array(PersonSchema)
}) as Schema.Schema<any>;

const OptionalSchema = Schema.Struct({
    required: Schema.String,
    optional: Schema.optional(Schema.Number)
}) as Schema.Schema<any> as Schema.Schema<Optional>;

describe("StructuredOutputPipeline", () => {
    it("should validate complex object", () =>
        Effect.gen(function* () {
            const mockObjectService = Effect.Service<ObjectServiceApi>()("ObjectService", {
                effect: Effect.succeed({
                    generate: () => Effect.succeed({
                        object: {
                            id: "test-id",
                            data: [],
                            metadata: {
                                createdAt: "2021-01-01",
                                updatedAt: "2021-01-01"
                            }
                        },
                        id: "result-id",
                        model: "test-model",
                        timestamp: new Date(),
                        usage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 },
                        finishReason: "stop"
                    } as GenerateObjectResult<ComplexObject>)
                }),
                dependencies: []
            });

            const pipeline = new StructuredOutputPipeline<ComplexObject>(ComplexObjectSchema as Schema.Schema<ComplexObject>);
            const result = yield* pipeline.run({
                prompt: "Generate a complex object",
                modelId: "test-model"
            }).pipe(Effect.provide(mockObjectService.Default));

            expect((result.data as ComplexObject).id).toBe("test-id");
            expect((result.data as ComplexObject).data).toEqual([]);
        })
    ),

    it("should handle validation errors", () =>
        Effect.gen(function* () {
            const mockObjectService = Effect.Service<ObjectServiceApi>()("ObjectService", {
                effect: Effect.succeed({
                    generate: () => Effect.succeed({
                        object: {
                            name: "John",
                            age: "invalid" as any, // Should be a number
                            email: "john@example.com"
                        },
                        id: "result-id",
                        model: "test-model",
                        timestamp: new Date(),
                        usage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 },
                        finishReason: "stop"
                    } as GenerateObjectResult<Person>)
                }),
                dependencies: []
            });

            const pipeline = new StructuredOutputPipeline<Person>(PersonSchema);
            const effect = pipeline.run({
                prompt: "Generate a person object",
                modelId: "test-model"
            }).pipe(Effect.provide(mockObjectService.Default));

            yield* Effect.flip(effect);
        })
    ),

    it("should handle empty array", () =>
        Effect.gen(function* () {
            const mockObjectService = Effect.Service<ObjectServiceApi>()("ObjectService", {
                effect: Effect.succeed({
                    generate: () => Effect.succeed({
                        object: {
                            items: []
                        },
                        id: "result-id",
                        model: "test-model",
                        timestamp: new Date(),
                        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 100 },
                        finishReason: "stop"
                    } as GenerateObjectResult<EmptyArray>)
                }),
                dependencies: []
            });

            const pipeline = new StructuredOutputPipeline<EmptyArray>(EmptyArraySchema as Schema.Schema<EmptyArray>);
            const result = yield* pipeline.run({
                prompt: "Generate an empty array",
                modelId: "test-model"
            }).pipe(Effect.provide(mockObjectService.Default));

            expect((result.data as EmptyArray).items).toEqual([]);
        })
    ),

    it("should handle optional fields", () =>
        Effect.gen(function* () {
            const mockObjectService = Effect.Service<ObjectServiceApi>()("ObjectService", {
                effect: Effect.succeed({
                    generate: () => Effect.succeed({
                        object: {
                            required: "test"
                        },
                        id: "result-id",
                        model: "test-model",
                        timestamp: new Date(),
                        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 100 },
                        finishReason: "stop"
                    } as GenerateObjectResult<Optional>)
                }),
                dependencies: []
            });

            const pipeline = new StructuredOutputPipeline<Optional>(OptionalSchema);
            const result = yield* pipeline.run({
                prompt: "Generate with optional field",
                modelId: "test-model"
            }).pipe(Effect.provide(mockObjectService.Default));

            expect((result.data as Optional).required).toBe("test");
            expect((result.data as Optional).optional).toBeUndefined();
        })
    )
});