import { createServiceTestHarness } from "@/services/core/test-utils/effect-test-harness.js"
import { StructuredOutputPipeline } from "@/services/pipeline/implementations/structured-output.js"
import { Context, Effect, Layer, Schema as S } from "effect"
import { describe, expect, it } from "vitest"

class E2ESchema extends S.Class<E2ESchema>("E2ESchema")({
    name: S.String,
    age: S.Number,
    email: S.String
}) { }

// Create service tag
class StructuredOutputTag extends Context.Tag("StructuredOutputPipeline")<
    StructuredOutputPipeline<E2ESchema>,
    StructuredOutputPipeline<E2ESchema>
>() { }

describe("StructuredOutputPipeline E2E Tests", () => {
    const pipeline = new StructuredOutputPipeline(E2ESchema)
    const testHarness = createServiceTestHarness(
        Layer.succeed(StructuredOutputTag, pipeline)
    )

    describe("Complete Structured Output Flow", () => {
        it("should process a complete structured output request flow", async () => {
            const input = {
                prompt: "Generate a person object with name, age, and email"
            }
            const effect = Effect.gen(function* () {
                const result = yield* pipeline.run(input)
                expect(result.data).toBeDefined()
                expect(result.data.name).toBeDefined()
                expect(result.data.age).toBeDefined()
                expect(result.data.email).toBeDefined()
                expect(result.usage).toBeDefined()
                return result.data
            })

            await testHarness.runTest(effect)
        })
    })

    describe("Pipeline Performance", () => {
        it("should complete structured output requests within acceptable timeframe", async () => {
            const input = {
                prompt: "Generate a person object with name, age, and email"
            }
            const effect = Effect.gen(function* () {
                const startTime = Date.now()
                const result = yield* pipeline.run(input)
                const endTime = Date.now()
                const executionTime = endTime - startTime
                expect(executionTime).toBeLessThan(10000) // Increased timeout for e2e test
                return result.data
            })

            await testHarness.runTest(effect)
        })
    })
}) 