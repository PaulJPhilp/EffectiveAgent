import { Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
    type GenerateStructuredOutputPayload,
    SchemaValidationError,
    StructuredOutputPipelineError
} from "../api.js";
import { MockLocalSchemaValidatorService, StructuredOutputPipelineService } from "../service.js";



const PersonSchema = Schema.Struct({
    name: Schema.String,
    age: Schema.Number
});
type Person = Schema.Schema.Type<typeof PersonSchema>;

const ProductSchema = Schema.Struct({
    productName: Schema.String,
    price: Schema.Number,
    inStock: Schema.Boolean
});
type Product = Schema.Schema.Type<typeof ProductSchema>;


describe("StructuredOutputPipeline Integration Tests", () => {
    const createTestService = () => Effect.gen(function* () {
        const service = yield* StructuredOutputPipelineService;
        return service;
    }).pipe(
        Effect.provide(MockLocalSchemaValidatorService.Default)
    );

    it("generateStructuredOutput should produce output (mocked LLM, real validation)", () => 
        Effect.gen(function* () {
            const service = yield* createTestService();
            const payload: GenerateStructuredOutputPayload<typeof PersonSchema> = {
                prompt: "Extract person details: My name is Alice and I am 30.",
                schema: PersonSchema
            };

            const result = yield* Effect.either(service.generateStructuredOutput(payload));

            expect(result._tag).toBe("Left"); // Expecting failure due to mock LLM output not matching schema
            if (result._tag === "Left") {
                const error = result.left as StructuredOutputPipelineError;
                expect(error).toBeInstanceOf(StructuredOutputPipelineError);
                // Check if the cause is SchemaValidationError if possible
                const cause = error.cause;
                if (cause instanceof SchemaValidationError) {
                    expect(cause.message).toContain("Schema validation failed");
                    expect(cause._tag).toBe("SchemaValidationError"); // Ensure it is our specific error type
                }
            }
        })
    );

    it("extractStructured should attempt to produce output (mocked LLM, real validation)", () => 
        Effect.gen(function* () {
            const service = yield* createTestService();
            const result = yield* Effect.either(service.extractStructured(
                "Product: XYZ, Price: 99.99, Stock: Yes", 
                ProductSchema
            ));

            expect(result._tag).toBe("Left");
            if (result._tag === "Left") {
                const error = result.left as StructuredOutputPipelineError;
                expect(error).toBeInstanceOf(StructuredOutputPipelineError);
            }
        })
    );
});