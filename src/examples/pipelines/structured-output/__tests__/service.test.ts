import { Schema as S } from "effect";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { MockLocalSchemaValidatorService, MockStructuredOutputPipelineService } from "../service.js";

class Person extends S.Class<Person>("Person")({
    name: S.String,
    age: S.Number
}){}

describe("StructuredOutputPipeline Service Tests (Unit)", () => {
    it("should generate structured output", () =>
        Effect.gen(function* () {
            const pipeline = yield* MockStructuredOutputPipelineService;
            const result = yield* pipeline.generateStructuredOutput<Person>({
                prompt: "Generate a person",
                schema: Person
            });

            expect(result).toBeDefined();
            expect(result.name).toBeTypeOf("string");
            expect(result.age).toBeTypeOf("number");
        }).pipe(
            Effect.provide(MockStructuredOutputPipelineService.Default),
            Effect.provide(MockLocalSchemaValidatorService.Default)
        )
    );

    it("should extract structured data", () =>
        Effect.gen(function* () {
            const pipeline = yield* MockStructuredOutputPipelineService;
            const result = yield* pipeline.extractStructured<Person>("some text", Person);

            expect(result).toBeDefined();
            expect(result.name).toBeTypeOf("string");
            expect(result.age).toBeTypeOf("number");
        }).pipe(
            Effect.provide(MockStructuredOutputPipelineService.Default),
            Effect.provide(MockLocalSchemaValidatorService.Default)
        )
    );
});