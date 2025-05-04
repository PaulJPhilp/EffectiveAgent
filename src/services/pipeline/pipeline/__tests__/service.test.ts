import { createServiceTestHarness } from "@/services/core/test-harness/utils/service-test.js"
import { createTypedMock } from "@/services/core/test-harness/utils/typed-mocks.js"
import { Effect, Schema } from "effect"
import { describe, expect, it } from "vitest"
import { PipelineService } from "../api.js"
import { InputValidationError, OutputValidationError } from "../errors.js"
import { ExecutiveService } from "../service.js"
import type { ExecutiveParameters } from "../types.js"

describe("PipelineService", () => {
    class TestInput extends Schema.Class<TestInput>("TestInput")({
        prompt: Schema.String
    }) { }

    class TestUsage extends Schema.Class<TestUsage>("TestUsage")({
        promptTokens: Schema.Number,
        completionTokens: Schema.Number,
        totalTokens: Schema.Number
    }) { }

    class TestOutput extends Schema.Class<TestOutput>("TestOutput")({
        text: Schema.String,
        usage: TestUsage
    }) { }

    const mockExecutiveService = createTypedMock<ExecutiveService>({
        execute: <R, E, A>(effect: Effect.Effect<A, E, R>, parameters?: ExecutiveParameters) =>
            Effect.succeed({
                text: "test response",
                usage: {
                    promptTokens: 1,
                    completionTokens: 1,
                    totalTokens: 2
                }
            } as A)
    })

    const serviceHarness = createServiceTestHarness(
        PipelineService,
        () => Effect.gen(function* () {
            const executiveService = mockExecutiveService
            return {
                execute: <In, Out>(
                    input: In,
                    schema: {
                        input: Schema.Schema<In>,
                        output: Schema.Schema<Out>
                    },
                    parameters?: ExecutiveParameters
                ) =>
                    Effect.gen(function* () {
                        const validInput = yield* Schema.decode(schema.input)(input)
                        const result = yield* executiveService.execute(Effect.succeed(validInput), parameters)
                        const validOutput = yield* Schema.decode(schema.output)(result)
                        return validOutput as Out
                    })
            }
        })
    )

    it("should execute pipeline with valid input/output", () =>
        Effect.gen(function* () {
            const service = yield* PipelineService
            const result = yield* service.execute(
                { prompt: "test" },
                {
                    input: TestInput,
                    output: TestOutput
                }
            )
            expect(result).toEqual({
                text: "test response",
                usage: {
                    promptTokens: 1,
                    completionTokens: 1,
                    totalTokens: 2
                }
            })
        }).pipe(Effect.provide(serviceHarness.TestLayer)))

    it("should fail with InputValidationError for invalid input", () =>
        Effect.gen(function* () {
            const service = yield* PipelineService
            const result = yield* Effect.either(
                service.execute(
                    { wrongField: "test" },
                    {
                        input: TestInput,
                        output: TestOutput
                    }
                )
            )
            expect(result._tag).toBe("Left")
            if (result._tag === "Left") {
                expect(result.left).toBeInstanceOf(InputValidationError)
            }
        }).pipe(Effect.provide(serviceHarness.TestLayer)))

    it("should fail with OutputValidationError for invalid output", () =>
        Effect.gen(function* () {
            // Override mock to return invalid output
            const originalExecute = mockExecutiveService.execute
            mockExecutiveService.execute = <R, E, A>() => Effect.succeed({ wrongField: "test" } as A)

            const service = yield* PipelineService
            const result = yield* Effect.either(
                service.execute(
                    { prompt: "test" },
                    {
                        input: TestInput,
                        output: TestOutput
                    }
                )
            )
            expect(result._tag).toBe("Left")
            if (result._tag === "Left") {
                expect(result.left).toBeInstanceOf(OutputValidationError)
            }

            // Restore original mock
            mockExecutiveService.execute = originalExecute
        }).pipe(Effect.provide(serviceHarness.TestLayer)))
}) 