import { Duration, Effect, Schedule } from "effect";
import { describe, expect, it } from "vitest";
import type { PipelineApi } from "../api.js";
import { PipelineExecutionError, PipelineValidationError } from "../errors.js";
import { Pipeline } from "../pipeline.service.js";

interface PipelineConfig {
    maxRetries?: number;
    retryDelay?: Duration.Duration;
    timeout?: Duration.Duration;
}

describe("Pipeline Service", () => {
    // Create test implementation of PipelineApi
    const testPipeline: PipelineApi = {
        execute: <A, E, R>(effect: Effect.Effect<A, E, R>, config: PipelineConfig = {}) =>
            Effect.gen(function* () {
                const retrySchedule = Schedule.recurs(config.maxRetries ?? 3).pipe(
                    Schedule.addDelay(() => config.retryDelay ?? Duration.seconds(1))
                );

                return yield* Effect.retry(effect, retrySchedule)
                    .pipe(
                        Effect.timeout(config.timeout ?? Duration.seconds(30)),
                        Effect.mapError(error => new PipelineExecutionError({
                            description: "Pipeline execution failed",
                            module: "PipelineService",
                            method: "execute",
                            cause: error
                        }))
                    );
            }),

        validateConfig: (config) => Effect.gen(function* () {
            const errors: string[] = [];

            if (config.maxRetries != null && (config.maxRetries < 0 || !Number.isInteger(config.maxRetries))) {
                errors.push("maxRetries must be a non-negative integer");
            }

            if (config.retryDelay != null && Duration.toMillis(config.retryDelay) <= 0) {
                errors.push("retryDelay must be a positive duration");
            }

            if (config.timeout != null && Duration.toMillis(config.timeout) <= 0) {
                errors.push("timeout must be a positive duration");
            }

            if (errors.length > 0) {
                return yield* Effect.fail(new PipelineValidationError({
                    description: "Pipeline configuration validation failed",
                    module: "PipelineService",
                    method: "validateConfig",
                    validationErrors: errors
                }));
            }
        })
    };

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

        it("should retry failed effects", () =>
            runPipelineTest(Effect.gen(function* () {
                let attempts = 0;
                const failingEffect = Effect.gen(function* () {
                    attempts++;
                    if (attempts < 2) {
                        return yield* Effect.fail("error");
                    }
                    return "success";
                });

                const pipeline = yield* Pipeline;
                const result = yield* pipeline.execute(failingEffect);
                expect(result).toBe("success");
                expect(attempts).toBe(2);
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
                    maxRetries: 3,
                    retryDelay: Duration.seconds(1),
                    timeout: Duration.seconds(30)
                });
            }))
        );

        it("should reject invalid maxRetries", () =>
            runPipelineTest(Effect.gen(function* () {
                const pipeline = yield* Pipeline;
                const result = yield* Effect.either(
                    pipeline.validateConfig({
                        maxRetries: -1
                    })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(PipelineValidationError);
                    expect(result.left.validationErrors).toContain("maxRetries must be a non-negative integer");
                }
            }))
        );

        it("should reject invalid durations", () =>
            runPipelineTest(Effect.gen(function* () {
                const pipeline = yield* Pipeline;
                const result = yield* Effect.either(
                    pipeline.validateConfig({
                        retryDelay: Duration.millis(-100),
                        timeout: Duration.millis(0)
                    })
                );

                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(PipelineValidationError);
                    expect(result.left.validationErrors).toContain("retryDelay must be a positive duration");
                    expect(result.left.validationErrors).toContain("timeout must be a positive duration");
                }
            }))
        );
    });
});