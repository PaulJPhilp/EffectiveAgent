import * as S from "@effect/schema/Schema";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { CacheServiceLiveLayer } from "../cache/service.js";
import {
    type GenerateStructuredOutputPayload,
    SchemaValidationError,
    StructuredOutputPipeline,
    StructuredOutputPipelineError
} from "../contract.js";
import {
    SchemaValidatorToolLiveLayer,
    StructuredOutputPipelineLiveLayer
} from "../service.js";

// Composite layer for E2E tests, using live services
const E2EEnvLayer = Layer.provide(
    StructuredOutputPipelineLiveLayer,
    Layer.merge(CacheServiceLiveLayer, SchemaValidatorToolLiveLayer)
);

const UserProfileSchema = S.Struct({
    username: S.String,
    email: S.String,
    isActive: S.Boolean
});
type UserProfile = S.Schema.Type<typeof UserProfileSchema>;


describe("StructuredOutputPipeline E2E Tests", () => {
    it("generateStructuredOutput should attempt full flow and fail validation with mock LLM", async () => {
        const payload: GenerateStructuredOutputPayload<typeof UserProfileSchema> = {
            prompt: "Create a user profile for 'john.doe' with email 'john@example.com', active status true.",
            schema: UserProfileSchema
        };

        const program = Effect.gen(function* () {
            const service = yield* StructuredOutputPipeline;
            // The live pipeline uses generateMockLlmOutput which returns {},
            // and SchemaValidatorToolLiveLayer which uses S.decodeUnknown.
            // This will fail validation for UserProfileSchema as fields are not optional.
            return yield* Effect.either(service.generateStructuredOutput(payload));
        });

        const result = await Effect.runPromise(program.pipe(Effect.provide(E2EEnvLayer)));

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(StructuredOutputPipelineError);
            const cause = result.left.cause;
            if (cause instanceof SchemaValidationError) {
                expect(cause.message).toContain("Schema validation failed");
            }
            // Further checks could inspect the prompt formatting or cache interaction if needed,
            // but the primary check here is that the pipeline runs and fails as expected with current mocks.
        }
    }, 10000); // Increased timeout for E2E style test

    // Add more E2E tests if the LLM mock becomes more sophisticated or if a real LLM is wired up.
    // For example, testing retry logic would require the LLM mock to fail a few times then succeed,
    // or the validator to behave similarly.
}); 