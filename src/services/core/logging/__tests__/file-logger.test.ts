import { Effect, Exit, LogLevel } from "effect";
import * as NodeFs from "node:fs/promises";
import * as NodePath from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FileLogger } from "../file-logger.js";

const TEST_LOG_DIR = NodePath.join(process.cwd(), "test-logs");
const TEST_LOG_FILE = "test-logger";

// Small file size to test rotation
const TEST_MAX_FILE_SIZE = 200; // bytes
const TEST_MAX_BACKUPS = 2;

describe("FileLogger", () => {
    let fileLogger: FileLogger;

    beforeAll(async () => {
        // Ensure test directory exists and is empty
        await NodeFs.mkdir(TEST_LOG_DIR, { recursive: true });
        await NodeFs.chmod(TEST_LOG_DIR, 0o777); // Ensure directory is writable
        await cleanTestDirectory();
    });

    beforeEach(async () => {
        await cleanTestDirectory();
        await NodeFs.chmod(TEST_LOG_DIR, 0o777); // Reset permissions before each test
        fileLogger = new FileLogger({
            logDir: TEST_LOG_DIR,
            logFileBaseName: TEST_LOG_FILE,
            maxFileSize: TEST_MAX_FILE_SIZE,
            maxBackups: TEST_MAX_BACKUPS,
            minLogLevel: LogLevel.Debug
        });
        // Initialize the logger before each test
        await Effect.runPromise(fileLogger.initialize());
    });

    afterEach(async () => {
        try {
            if (fileLogger) {
                await Effect.runPromise(fileLogger.close());
            }
        } catch (error) {
            console.error('Error closing logger:', error);
        }
        await NodeFs.chmod(TEST_LOG_DIR, 0o777); // Ensure we can clean up
        await cleanTestDirectory();
    });

    afterAll(async () => {
        await NodeFs.chmod(TEST_LOG_DIR, 0o777); // Ensure we can clean up
        await cleanTestDirectory();
        try {
            await NodeFs.rmdir(TEST_LOG_DIR);
        } catch (error) {
            console.error('Error removing test directory:', error);
        }
    });

    async function cleanTestDirectory() {
        try {
            const files = await NodeFs.readdir(TEST_LOG_DIR);
            await Promise.all(
                files.map(async file => {
                    const filePath = NodePath.join(TEST_LOG_DIR, file);
                    await NodeFs.chmod(filePath, 0o666); // Ensure file is writable
                    await NodeFs.unlink(filePath);
                })
            );
        } catch (error) {
            console.error('Error cleaning test directory:', error);
        }
    }

    async function waitForFileContent(filePath: string, timeout = 5000): Promise<string> {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            try {
                const content = await NodeFs.readFile(filePath, 'utf8');
                if (content) {
                    // Add a small delay to ensure file is fully written
                    await new Promise(resolve => setTimeout(resolve, 100));
                    return await NodeFs.readFile(filePath, 'utf8');
                }
            } catch (error) {
                // Ignore errors and keep trying
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error(`Timeout waiting for file content: ${filePath}`);
    }

    async function getAllLogFiles(): Promise<string[]> {
        try {
            const files = await NodeFs.readdir(TEST_LOG_DIR);
            return files
                .filter(f => f.startsWith(TEST_LOG_FILE))
                .sort((a, b) => {
                    // Sort by backup number, with main log file first
                    const aNum = a === `${TEST_LOG_FILE}.log` ? -1 : parseInt(a.split('.')[1] || '0');
                    const bNum = b === `${TEST_LOG_FILE}.log` ? -1 : parseInt(b.split('.')[1] || '0');
                    return aNum - bNum;
                });
        } catch (error) {
            console.error('Error reading log directory:', error);
            return [];
        }
    }

    async function getAllLogContent(): Promise<string[]> {
        const files = await getAllLogFiles();
        const contents = await Promise.all(
            files.map(async file => {
                try {
                    return await waitForFileContent(NodePath.join(TEST_LOG_DIR, file));
                } catch (error) {
                    console.error(`Error reading file ${file}:`, error);
                    return '';
                }
            })
        );
        return contents
            .filter(Boolean)
            .flatMap(content => content.split('\n').filter(Boolean));
    }

    it("should initialize and write logs successfully", async () => {
        const logger = fileLogger.createLoggingService();

        await Effect.runPromise(
            Effect.gen(function* () {
                yield* logger.info("Test message", { test: true });
                yield* logger.debug("Debug message", { debug: true });
                yield* logger.error("Error message", new Error("Test error"));
            })
        );

        const logContent = await waitForFileContent(NodePath.join(TEST_LOG_DIR, `${TEST_LOG_FILE}.log`));
        const logs = logContent.split('\n').filter(Boolean).map(l => JSON.parse(l));

        expect(logs).toHaveLength(3);
        expect(logs[0]).toMatchObject({
            level: "INFO",
            message: "Test message",
            test: true
        });
        expect(logs[1]).toMatchObject({
            level: "DEBUG",
            message: "Debug message",
            debug: true
        });
        expect(logs[2]).toMatchObject({
            level: "ERROR",
            message: "Error message",
            error: "Test error"
        });
        expect(logs[2]).toHaveProperty("stack");
    });

    it("should respect minimum log level", async () => {
        const logger = fileLogger.createLoggingService();

        await Effect.runPromise(
            Effect.gen(function* () {
                yield* logger.debug("Debug message", { debug: true });
                yield* logger.info("Info message", { info: true });
            })
        );

        const logContent = await waitForFileContent(NodePath.join(TEST_LOG_DIR, `${TEST_LOG_FILE}.log`));
        const logs = logContent.split('\n').filter(Boolean);
        expect(logs).toHaveLength(2);
    });

    it("should handle errors during initialization", async () => {
        fileLogger = new FileLogger({
            ...fileLogger["config"],
            logDir: "/nonexistent/directory"
        });

        const result = await Effect.runPromiseExit(fileLogger.initialize());
        expect(Exit.isFailure(result)).toBe(true);
        const cause = Exit.match(result, {
            onFailure: (cause) => cause,
            onSuccess: () => null
        });
        expect(cause?.toString()).toContain("Failed to create log directory");
    });

    it("should properly format and log error causes", async () => {
        const logger = fileLogger.createLoggingService();
        const error = new Error("Test error");
        error.cause = new Error("Nested error");

        await Effect.runPromise(
            Effect.gen(function* () {
                yield* logger.error("Error with cause", error);
            })
        );

        const logContent = await waitForFileContent(NodePath.join(TEST_LOG_DIR, `${TEST_LOG_FILE}.log`));
        const logs = logContent.split('\n').filter(Boolean).map(l => JSON.parse(l));

        expect(logs).toHaveLength(1);
        expect(logs[0]).toMatchObject({
            level: "ERROR",
            message: "Error with cause",
            error: "Test error",
            cause: "Error: Nested error"
        });
    });

    it("should handle concurrent writes correctly", async () => {
        const logger = fileLogger.createLoggingService();
        const promises = [];

        // Create multiple concurrent writes
        for (let i = 0; i < 50; i++) {
            promises.push(
                Effect.runPromise(
                    logger.info(`Message ${i}`, { index: i })
                )
            );
        }

        await Promise.all(promises);

        // Verify all messages were written
        const logs = await getAllLogContent();
        const parsedLogs = logs.map(l => JSON.parse(l));
        expect(parsedLogs).toHaveLength(50);

        // Verify all messages are present (order does not matter)
        const indices = parsedLogs.map(log => log.index);
        expect(new Set(indices)).toEqual(new Set([...Array(50).keys()]));
    });

    it("should preserve log content across rotations", async () => {
        const logger = fileLogger.createLoggingService();
        const longMessage = "x".repeat(TEST_MAX_FILE_SIZE / 2);

        await Effect.runPromise(
            Effect.gen(function* () {
                // Write enough data to trigger multiple rotations
                for (let i = 0; i < 10; i++) {
                    yield* logger.info(`${longMessage} ${i}`);
                }
            })
        );

        const logs = await getAllLogContent();
        const messages = logs.map(l => JSON.parse(l).message);
        expect(messages).toHaveLength(10);
        expect(messages).toEqual(
            Array.from({ length: 10 }, (_, i) => `${longMessage} ${i}`)
        );
    });

    it("should handle write errors after file handle is closed", async () => {
        const logger = fileLogger.createLoggingService();

        // Close the logger
        await Effect.runPromise(fileLogger.close());

        // Attempt to write after closing
        const result = await Effect.runPromiseExit(
            logger.info("This should fail")
        );
        expect(Exit.isFailure(result)).toBe(true);
        const failure = Exit.match(result, {
            onFailure: (cause) => cause,
            onSuccess: () => null
        });
        expect(failure?.toString()).toContain("Log file not open");
    });

    it("should handle nested error objects correctly", async () => {
        const logger = fileLogger.createLoggingService();
        const nestedError = {
            name: "TestError",
            message: "Test error",
            code: "TEST_ERROR",
            details: {
                reason: "Testing",
                timestamp: new Date().toISOString()
            }
        };

        await Effect.runPromise(
            Effect.gen(function* () {
                yield* logger.error("Complex error", nestedError);
            })
        );

        const logContent = await waitForFileContent(NodePath.join(TEST_LOG_DIR, `${TEST_LOG_FILE}.log`));
        const logs = logContent.split('\n').filter(Boolean).map(l => JSON.parse(l));

        expect(logs).toHaveLength(1);
        expect(logs[0]).toMatchObject({
            level: "ERROR",
            message: "Complex error",
            error: JSON.stringify(nestedError)
        });
    });
});
