import { createServiceTestHarness } from "@/services/core/test-utils/effect-test-harness.js"
import { StructuredOutputPipeline } from "@/services/pipeline/implementations/structured-output.js"
import { Context, Effect, Layer, Schema as S } from "effect"
import { describe, expect, it } from "vitest"

// Define test schema using Schema
class TestSchema extends S.Class<TestSchema>("TestSchema")({
    name: S.String,
    age: S.Number,
    email: S.String
}) { }

// Create service tag
class StructuredOutputTag extends Context.Tag("StructuredOutputPipeline")<
    StructuredOutputPipeline<TestSchema>,
    StructuredOutputPipeline<TestSchema>
>() { }

describe("StructuredOutputPipeline Integration", () => {
    const pipeline = new StructuredOutputPipeline(TestSchema)
    const testHarness = createServiceTestHarness(
        Layer.succeed(StructuredOutputTag, pipeline)
    )

    describe("Pipeline Integration", () => {
        it("should generate structured output matching schema", async () => {
            const input = {
                prompt: "Generate a person object with name, age, and email"
            }
            const effect = Effect.gen(function* () {
                const result = yield* pipeline.run(input)
                expect(result.data).toBeDefined()
                expect(typeof result.data.name).toBe("string")
                expect(typeof result.data.age).toBe("number")
                expect(typeof result.data.email).toBe("string")
                expect(result.usage).toBeDefined()
                expect(result.usage.totalTokens).toBeGreaterThan(0)
                return result.data
            })

            await testHarness.runTest(effect)
        })

        it("should fail validation for invalid input", async () => {
            const input = {
                prompt: "" // Invalid empty prompt
            }
            const effect = Effect.gen(function* () {
                return yield* pipeline.run(input)
            })

            await expect(testHarness.runFailTest(effect)).resolves.toBeDefined()
        })

        it("should handle errors gracefully", async () => {
            const input = {
                prompt: "Generate a person object with name, age, and email",
                modelId: "non-existent-model" // Invalid model ID
            }
            const effect = Effect.gen(function* () {
                return yield* pipeline.run(input)
            })

            await expect(testHarness.runFailTest(effect)).resolves.toBeDefined()
        })
    })
}) 