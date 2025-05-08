import { afterAll, beforeAll, describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { StructuredOutputPipeline, StructuredOutputPipelineInput } from "../contract.js"
import { StructuredOutputPipelineLayer } from "../service.js"

const e2eSchema = {
    name: String,
    age: Number,
    email: String
} as const

describe("StructuredOutputPipeline E2E Tests", () => {
    beforeAll(() => {
        // Global setup if needed
    })

    afterAll(() => {
        // Global cleanup if needed
    })

    describe("Complete Structured Output Flow", () => {
        it("should process a complete structured output request flow", async () => {
            const input: StructuredOutputPipelineInput<typeof e2eSchema> = {
                prompt: "Generate a person object with name, age, and email",
                schema: e2eSchema
            }
            const program = Effect.gen(function* () {
                const pipeline = yield* StructuredOutputPipeline
                const result = yield* pipeline.generateStructuredOutput<typeof e2eSchema, typeof e2eSchema>(input)
                return result
            })
            const result = await Effect.runPromise(
                program.pipe(Effect.provide(StructuredOutputPipelineLayer))
            )
            expect(result).toBeDefined()
            expect(result.name).toBeDefined()
            expect(result.age).toBeDefined()
            expect(result.email).toBeDefined()
        })
    })

    describe("Pipeline Performance", () => {
        it("should complete structured output requests within acceptable timeframe", async () => {
            const input: StructuredOutputPipelineInput<typeof e2eSchema> = {
                prompt: "Generate a person object with name, age, and email",
                schema: e2eSchema
            }
            const program = Effect.gen(function* () {
                const pipeline = yield* StructuredOutputPipeline
                return yield* pipeline.generateStructuredOutput<typeof e2eSchema, typeof e2eSchema>(input)
            })
            const startTime = Date.now()
            await Effect.runPromise(
                program.pipe(Effect.provide(StructuredOutputPipelineLayer))
            )
            const endTime = Date.now()
            const executionTime = endTime - startTime
            expect(executionTime).toBeLessThan(1000)
        })
    })
}) 