import * as S from "@effect/schema/Schema";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { CacheServiceTestLayer } from "../cache/service.js";
import {
    type GenerateStructuredOutputPayload,
    StructuredOutputPipeline
} from "../contract.js";
import {
    SchemaValidatorToolTestLayer,
    StructuredOutputPipelineTestLayer // This TestLayer uses mock impls for pipeline, validator, and cache
} from "../service.js";

// Composite layer for tests
const TestEnvLayer = Layer.provide(
    StructuredOutputPipelineTestLayer,
    Layer.merge(CacheServiceTestLayer, SchemaValidatorToolTestLayer)
);

const PersonSchema = S.Struct({
    name: S.String,
    age: S.Number
});
type Person = S.Schema.Type<typeof PersonSchema>;


describe("StructuredOutputPipeline Service Tests (Unit)", () => {
    it("should use mock implementation for generateStructuredOutput", async () => {
        const payload: GenerateStructuredOutputPayload<typeof PersonSchema> = {
            prompt: "Create a person",
            schema: PersonSchema
        };

        const program = Effect.gen(function* () {
            const service = yield* StructuredOutputPipeline;
            return yield* service.generateStructuredOutput(payload);
        });

        const result = await Effect.runPromise(program.pipe(Effect.provide(TestEnvLayer)));

        // The mock implementation in service.ts returns {} as Person or a literal from schema if possible
        // For PersonSchema, it will be {}. Let's check if it's an object.
        expect(typeof result).toBe("object");
        // A more specific check if the mock was more detailed:
        // expect(result.name).toBe("Mocked Name"); 
    });

    it("should use mock implementation for extractStructured", async () => {
        const program = Effect.gen(function* () {
            const service = yield* StructuredOutputPipeline;
            return yield* service.extractStructured("Some text about a person", PersonSchema);
        });

        const result = await Effect.runPromise(program.pipe(Effect.provide(TestEnvLayer)));
        expect(typeof result).toBe("object");
    });

    // Example: Testing a case where the (mocked) schema validator might fail
    // To do this, we'd need a way to configure the SchemaValidatorToolTestLayer 
    // or provide a different SchemaValidatorTool layer that is designed to fail for certain inputs.
    // The current SchemaValidatorToolTestLayer uses makeMockSchemaValidatorToolImpl which always fails with "Not implemented".
    // The StructuredOutputPipelineTestLayer uses makeMockStructuredOutputPipelineImpl, which doesn't actually call the validator in its mock.

    // For a more thorough unit test of StructuredOutputPipeline's logic (like retry),
    // we would need a more sophisticated mock for SchemaValidatorTool that we can control from the test,
    // or test makeStructuredOutputPipelineImpl directly with controlled mock dependencies.

    // Current test focuses on layer composition and basic mock behavior.
}); 