import { Effect, LogLevel } from "effect";
import { FileLogger } from "../file-logger.js";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as NodePath from "node:path";
import * as NodeFs from "node:fs/promises";

const TEST_LOG_DIR = NodePath.join(process.cwd(), "test-logs");
const TEST_LOG_FILE = "simple-test";

describe("FileLogger", () => {
    let fileLogger: FileLogger;

    beforeAll(async () => {
        fileLogger = new FileLogger({
            logDir: TEST_LOG_DIR,
            logFileBaseName: TEST_LOG_FILE,
            maxFileSize: 1024 * 1024,
            maxBackups: 3,
            minLogLevel: LogLevel.Debug
        });

        await Effect.runPromise(fileLogger.initialize());
    });

    afterAll(async () => {
        await Effect.runPromise(fileLogger.close());
    });

    it("should write logs to a file", async () => {
        const logger = fileLogger.createLoggingService();
        
        await Effect.runPromise(
            Effect.gen(function* () {
                yield* logger.info("Test message", { test: true });
                yield* logger.debug("Debug message", { debug: true });
                yield* logger.error("Error message", { error: true });
            })
        );

        // Read the log file
        const logContent = await NodeFs.readFile(
            NodePath.join(TEST_LOG_DIR, `${TEST_LOG_FILE}.log`), 
            'utf8'
        );

        // Verify logs were written
        expect(logContent).toContain("Test message");
        expect(logContent).toContain("Debug message");
        expect(logContent).toContain("Error message");
    });
});
