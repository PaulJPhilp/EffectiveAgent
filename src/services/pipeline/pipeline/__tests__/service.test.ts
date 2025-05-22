import { Effect, Layer, Schema, Duration, Cause } from "effect";
import * as S from "effect/Schema";
import { describe, expect, it, vi, beforeEach } from "vitest"; 

// Corrected imports for ExecutiveService components
import { ExecutiveParameters, ExecutiveServiceApi } from "../../executive-service/api.js";
import { ExecutiveServiceError } from "../../executive-service/errors.js"; 
import { ExecutiveService } from "../../executive-service/service.js";

import { PipelineService } from "../service.js";
import { LoggingService } from "@/services/core/logging/service.js"; 
import { InputValidationError, OutputValidationError } from "../errors.js";

describe("PipelineService", () => {
    // Global mock setup for ExecutiveService
    const mockExecutiveExecute = vi.fn();
    const mockExecutiveServiceInstance: ExecutiveServiceApi = {
        _tag: "ExecutiveService" as const,
        execute: mockExecutiveExecute,
    };
    const MockExecutiveServiceLayer = Layer.succeed(
        ExecutiveService,
        mockExecutiveServiceInstance
    );

    // Reset mock before each test to ensure test isolation
    beforeEach(() => {
        mockExecutiveExecute.mockReset();
    });

    class TestInput extends S.Class<TestInput>("TestInput")({
        prompt: Schema.String
    }) { }

    class TestUsage extends S.Class<TestUsage>("TestUsage")({
        promptTokens: Schema.Number,
        completionTokens: Schema.Number,
        totalTokens: Schema.Number
    }) { }

    class TestOutput extends S.Class<TestOutput>("TestOutput")({
        text: Schema.String,
        usage: TestUsage
    }) { }

    // Tests will now use the MOCKED ExecutiveService via MockExecutiveServiceLayer.

    it("should execute pipeline with valid input/output", () => {
        mockExecutiveExecute.mockImplementationOnce((effect: Effect.Effect<any,any,any>, params?: ExecutiveParameters) => effect); 

        return Effect.gen(function* () {
            const service = yield* PipelineService;
            const inputData = new TestInput({ prompt: "test prompt for mock exec" });
            const inputEffect = Effect.succeed(inputData);
            const parameters: ExecutiveParameters = { timeoutMs: 5000 };

            const result = yield* Effect.either(service.execute(inputEffect, parameters));

            expect(mockExecutiveExecute).toHaveBeenCalledTimes(1);
            expect(mockExecutiveExecute).toHaveBeenCalledWith(inputEffect, parameters);

            expect(result._tag).toBe("Right");
            if (result._tag === "Right") {
                expect(result.right).toEqual(inputData); 
            }
        }).pipe(
            Effect.provide(PipelineService.Default),
            Effect.provide(MockExecutiveServiceLayer), 
            Effect.provide(LoggingService.Default)
        )
    });

    it("should pass through error from executed effect, wrapped by mock ExecutiveService", () => {
        const originalError = new Error("test effect error");
        const failingEffect = Effect.fail(originalError);

        mockExecutiveExecute.mockImplementationOnce((effect: Effect.Effect<any,any,any>, params?: ExecutiveParameters) => 
            effect.pipe(
                Effect.catchAll((e) => {
                    const causeMessage = e instanceof Error ? e.message : String(e);
                    return Effect.fail(new ExecutiveServiceError(`Mocked wrapper for original error. Cause: ${causeMessage}`));
                })
            )
        );
        
        return Effect.gen(function* () {
            const service = yield* PipelineService;
            const result = yield* Effect.either(service.execute(failingEffect)); 

            expect(mockExecutiveExecute).toHaveBeenCalledTimes(1);
            expect(mockExecutiveExecute).toHaveBeenCalledWith(failingEffect, undefined); 

            expect(result._tag).toBe("Left");
            if (result._tag === "Left") {
                expect(result.left).toBeInstanceOf(ExecutiveServiceError);
                expect(result.left.message).toContain("Mocked wrapper for original error. Cause: test effect error");
            }
        }).pipe(
            Effect.provide(PipelineService.Default),
            Effect.provide(MockExecutiveServiceLayer), 
            Effect.provide(LoggingService.Default)
        )
    });

    it("should pass through an existing ExecutiveServiceError from effect via mock", () => {
        const originalExecError = new ExecutiveServiceError("Initial executive error from effect");
        const effectThatFailsWithExecError = Effect.fail(originalExecError);

        mockExecutiveExecute.mockImplementationOnce((effect: Effect.Effect<any,any,any>, params?: ExecutiveParameters) => effect); 

        return Effect.gen(function* () {
            const service = yield* PipelineService;
            const result = yield* Effect.either(service.execute(effectThatFailsWithExecError));

            expect(mockExecutiveExecute).toHaveBeenCalledTimes(1);
            expect(mockExecutiveExecute).toHaveBeenCalledWith(effectThatFailsWithExecError, undefined);

            expect(result._tag).toBe("Left");
            if (result._tag === "Left") {
                expect(result.left).toBe(originalExecError); 
            }
        }).pipe(
            Effect.provide(PipelineService.Default),
            Effect.provide(MockExecutiveServiceLayer), 
            Effect.provide(LoggingService.Default)
        );
    });

    it("should handle timeout correctly by passing parameters to ExecutiveService", () => {
        mockExecutiveExecute.mockImplementationOnce((_effect: Effect.Effect<any, any, any>, params?: ExecutiveParameters) => {
            if (params && params.timeoutMs && params.timeoutMs < 200) { 
                return Effect.fail(new ExecutiveServiceError("Mocked timeout from ExecutiveService"));
            }
            return _effect; 
        });

        return Effect.gen(function* () {
            const service = yield* PipelineService;
            const inputEffect = Effect.succeed(new TestInput({ prompt: "test effect" }));
            const paramsWithTimeout: ExecutiveParameters = { timeoutMs: 10 };

            const result = yield* Effect.either(service.execute(inputEffect, paramsWithTimeout));

            expect(mockExecutiveExecute).toHaveBeenCalledTimes(1);
            expect(mockExecutiveExecute).toHaveBeenCalledWith(inputEffect, paramsWithTimeout);

            expect(result._tag).toBe("Left");
            if (result._tag === "Left") {
                expect(result.left).toBeInstanceOf(ExecutiveServiceError);
                expect(result.left.message).toContain("Mocked timeout from ExecutiveService");
            }
        }).pipe(
            Effect.provide(PipelineService.Default),
            Effect.provide(MockExecutiveServiceLayer), 
            Effect.provide(LoggingService.Default)
        )
    });
});