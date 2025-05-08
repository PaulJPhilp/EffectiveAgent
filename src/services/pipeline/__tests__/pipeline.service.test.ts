import { Duration, Effect } from "effect";
import { describe, expect, it } from "vitest";
import { PipelineApi } from "../api.js";
import { PipelineExecutionError, PipelineValidationError } from "../errors.js";
import { Pipeline } from "../pipeline.service.js";

describe("PipelineService", () => {
    const testPipeline = {
        _tag: "Pipeline" as const,
        execute: <A, E, R>(effect: Effect.Effect<A, E, R>, config = {}) =>
            Effect.succeed({}),
        validateConfig: (config) => Effect.unit
    } satisfies PipelineApi;

    const runPipelineTest = <E, A>(effect: Effect.Effect<A, E, PipelineApi>) =>
        Effect.runPromise(Effect.provideService(effect, Pipeline, testPipeline));

    describe("execute", () => {
        it("should successfully execute an effect with default config", () =>
            runPipelineTest(Effect.gen(function* () {
                const pipeline = yield* Pipeline;
                const result = yield* pipeline.execute(
                    Effect.succeed("success")
                );
                expect(result).toBe("success");
            }))
        );

        it("should timeout if effect takes too long", () =>
            runPipelineTest(Effect.gen(function* () {
                const slowEffect = Effect.gen(function* () {
                    yield* Effect.sleep(Duration.seconds(2));
                    return "success";
                });

                const pipeline = yield* Pipeline;
                const result = yield* Effect.either(
                    pipeline.execute(
                        slowEffect,
                        { timeout: Duration.seconds(1) }
                    )
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(PipelineExecutionError);
                }
            }))
        );
    });

    describe("validateConfig", () => {
        it("should validate valid config", () =>
            runPipelineTest(Effect.gen(function* () {
                const pipeline = yield* Pipeline;
                yield* pipeline.validateConfig({
                    timeout: Duration.seconds(30)
                });
            }))
        );

        it("should reject invalid durations", () =>
            runPipelineTest(Effect.gen(function* () {
                const pipeline = yield* Pipeline;
                const result = yield* Effect.either(
                    pipeline.validateConfig({
                        timeout: Duration.millis(0)
                    })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(PipelineValidationError);
                    expect(result.left.validationErrors).toContain("timeout must be a positive duration");
                }
            }))
        );
    });
});