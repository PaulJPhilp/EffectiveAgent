/**
 * @file Test helper functions for weather pipeline tests
 */

import { FileLogger } from "@/services/core/logging/file-logger.js";
import { Effect, LogLevel } from "effect";

export async function makeLogger(name: string) {
    const fileLogger = new FileLogger({
        logDir: "test-logs",
        logFileBaseName: name,
        minLogLevel: LogLevel.Debug
    });
    await Effect.runPromise(fileLogger.initialize());
    return fileLogger.createLoggingService();
}

export async function setupTestLogger(name: string): Promise<void> {
    const logger = await makeLogger(name);
    await Effect.runPromise(logger.info("Initializing test logger", { name }));
}

/**
 * Runs an Effect with a file logger provided in the same fiber.
 * Ensures all logs are captured in the specified log file.
 */
export async function withTestLogger<E, A>(name: string, effect: Effect.Effect<never, E, A>): Promise<A> {
    await setupTestLogger(name);
    const exit = await Effect.runPromiseExit(effect as Effect.Effect<never, E, never>);
    if (exit._tag === "Success") return exit.value as A;
    throw exit.cause;
} 