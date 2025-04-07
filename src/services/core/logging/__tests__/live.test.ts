/**
 * @file Tests for the LoggingApi live implementation.
 */

import { describe, it, expect } from "vitest";
import { Effect, Layer, LogLevel, Cause } from "effect";
import { LoggingApi } from "@core/logging/types.js"; // LoggingApi comes from types.ts
import {
    LoggingApiLiveLayer,
    LoggingLevelLayer, // LoggingLevelLayer comes from live.ts
} from "@core/logging/live.js"; // Use path alias

describe("LoggingApiLive", () => {
    // Helper function to run effects with the LoggingApiLiveLayer provided
    const runTest = <E, A>(effect: Effect.Effect<A, E, LoggingApi>) =>
        Effect.runPromise(Effect.provide(effect, LoggingApiLiveLayer));

    it("should provide LoggingApi and allow calling log methods", async () => {
        const effect = Effect.gen(function* () {
            const logger = yield* LoggingApi;
            yield* logger.log(LogLevel.Info, "Test log message", { key: "value" });
            yield* logger.debug("Test debug message");
            yield* logger.info("Test info message");
            yield* logger.warn("Test warn message");
            yield* logger.error("Test error message", { code: 123 });
            yield* logger.error("Test error with Error", new Error("Something failed"));
            yield* logger.trace("Test trace message");
            yield* logger.logCause(LogLevel.Warning, Cause.die("Test cause"));
            yield* logger.logErrorCause(Cause.fail("Test error cause"));
        });

        // Expect the effect to complete successfully (void)
        await expect(runTest(effect)).resolves.toBeUndefined();
    });

    it("should allow setting log level via LoggingLevelLayer", async () => {
        const levelLayer = LoggingLevelLayer(LogLevel.Debug);
        // Merge the layer providing the service and the layer setting the level
        const combinedLayer = Layer.merge(LoggingApiLiveLayer, levelLayer);

        const effect = Effect.gen(function* () {
            const logger = yield* LoggingApi;
            // This log might or might not appear depending on the test runner's
            // default level vs. the Debug level we set, but the effect should run.
            yield* logger.info("Info message after setting level");
            yield* logger.debug("Debug message after setting level");
        });

        // Provide the *merged* layer to the effect
        // The resulting effect requires 'never' and can be run
        await expect(Effect.runPromise(Effect.provide(effect, combinedLayer)))
            .resolves.toBeUndefined();
    });

    // Example of testing a specific method signature if needed
    it("error method should accept Error object", async () => {
        const effect = Effect.gen(function* () {
            const logger = yield* LoggingApi;
            yield* logger.error("Error occurred", new Error("Specific error instance"));
        });
        await expect(runTest(effect)).resolves.toBeUndefined();
    });

    it("error method should accept JsonObject", async () => {
        const effect = Effect.gen(function* () {
            const logger = yield* LoggingApi;
            yield* logger.error("Error occurred", { errorCode: "E101" });
        });
        await expect(runTest(effect)).resolves.toBeUndefined();
    });
});
