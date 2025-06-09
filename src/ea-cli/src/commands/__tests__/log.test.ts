import { FileSystem } from "@effect/platform"
import { NodeContext, NodeFileSystem } from "@effect/platform-node"
import { Effect, Either, Layer, Option } from "effect"
import { join } from "path"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { clearCommand, viewCommand } from "../log.js"

describe("log command functionality", () => {
    const TEST_DIR = join(process.cwd(), "test-workspace-log")
    const PROJECT_NAME = "test-log-project"
    const PROJECT_PATH = join(TEST_DIR, PROJECT_NAME)
    const CONFIG_DIR = join(PROJECT_PATH, "ea-config")
    const LOGS_DIR = join(PROJECT_PATH, "logs")
    const LOG_FILE = join(LOGS_DIR, "agent.log")

    // Test layer
    const testLayer = Layer.mergeAll(
        NodeFileSystem.layer,
        NodeContext.layer
    )

    // Valid master config with logging configuration
    const validMasterConfig = {
        name: "Test Project",
        version: "1.0.0",
        logging: {
            filePath: LOG_FILE,
            level: "info"
        },
        runtime: {
            maxMemory: 512,
            timeout: 30000
        }
    }

    // Sample log content for testing
    const sampleLogContent = [
        "2024-01-01T10:00:00.000Z [INFO] Agent initialized",
        "2024-01-01T10:01:00.000Z [DEBUG] Processing request",
        "2024-01-01T10:02:00.000Z [INFO] Request completed",
        "2024-01-01T10:03:00.000Z [WARN] Memory usage high",
        "2024-01-01T10:04:00.000Z [ERROR] Connection failed",
        "2024-01-01T10:05:00.000Z [INFO] Retrying connection",
        "2024-01-01T10:06:00.000Z [INFO] Connection restored",
        "2024-01-01T10:07:00.000Z [DEBUG] Cleanup completed"
    ].join("\n")

    beforeEach(async () => {
        await Effect.runPromise(
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem

                // Create test directories
                yield* Effect.all([
                    fs.makeDirectory(TEST_DIR, { recursive: true }),
                    fs.makeDirectory(PROJECT_PATH, { recursive: true }),
                    fs.makeDirectory(CONFIG_DIR, { recursive: true }),
                    fs.makeDirectory(LOGS_DIR, { recursive: true }),
                ])

                // Create master config file
                yield* fs.writeFileString(
                    join(CONFIG_DIR, "master-config.json"),
                    JSON.stringify(validMasterConfig, null, 2)
                )

                // Create sample log file
                yield* fs.writeFileString(LOG_FILE, sampleLogContent)

                // Change to project directory
                process.chdir(PROJECT_PATH)
            }).pipe(Effect.provide(testLayer))
        )
    })

    afterEach(async () => {
        await Effect.runPromise(
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem
                yield* fs.remove(TEST_DIR, { recursive: true })
            }).pipe(Effect.provide(testLayer))
        )
        process.chdir(join(TEST_DIR, ".."))
    })

    describe("log view command", () => {
        test("should display full log content without options", () =>
            Effect.gen(function* () {
                // Mock console.log to capture output
                const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { })

                const result = yield* Effect.either(
                    viewCommand.handler({
                        head: Option.none(),
                        tail: Option.none()
                    })
                )

                expect(Either.isRight(result)).toBe(true)
                expect(consoleSpy).toHaveBeenCalledWith(sampleLogContent)

                consoleSpy.mockRestore()
            }).pipe(Effect.provide(testLayer)))

        test("should display first N lines with --head option", () =>
            Effect.gen(function* () {
                const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { })

                const result = yield* Effect.either(
                    viewCommand.handler({
                        head: Option.some(3),
                        tail: Option.none()
                    })
                )

                expect(Either.isRight(result)).toBe(true)

                const expectedContent = sampleLogContent.split("\n").slice(0, 3).join("\n")
                expect(consoleSpy).toHaveBeenCalledWith(expectedContent)

                consoleSpy.mockRestore()
            }).pipe(Effect.provide(testLayer)))

        test("should display last N lines with --tail option", () =>
            Effect.gen(function* () {
                const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { })

                const result = yield* Effect.either(
                    viewCommand.handler({
                        head: Option.none(),
                        tail: Option.some(2)
                    })
                )

                expect(Either.isRight(result)).toBe(true)

                const expectedContent = sampleLogContent.split("\n").slice(-2).join("\n")
                expect(consoleSpy).toHaveBeenCalledWith(expectedContent)

                consoleSpy.mockRestore()
            }).pipe(Effect.provide(testLayer)))

        test("should handle empty log file", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem
                // Create empty log file
                yield* fs.writeFileString(LOG_FILE, "")

                const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { })

                const result = yield* Effect.either(
                    viewCommand.handler({
                        head: Option.none(),
                        tail: Option.none()
                    })
                )

                expect(Either.isRight(result)).toBe(true)
                expect(consoleSpy).toHaveBeenCalledWith("Log file is empty. Run an agent to generate logs.")

                consoleSpy.mockRestore()
            }).pipe(Effect.provide(testLayer)))

        test("should handle missing log file", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem
                // Remove log file
                yield* fs.remove(LOG_FILE)

                const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { })

                const result = yield* Effect.either(
                    viewCommand.handler({
                        head: Option.none(),
                        tail: Option.none()
                    })
                )

                expect(Either.isRight(result)).toBe(true)
                expect(consoleSpy).toHaveBeenCalledWith(
                    "Log file does not exist yet. It will be created when logs are generated.\nRun any agent command to generate logs."
                )

                consoleSpy.mockRestore()
            }).pipe(Effect.provide(testLayer)))
    })

    describe("log clear command", () => {
        test("should clear log file when confirmed", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem

                // Mock the confirmation prompt to return true
                const promptSpy = vi.fn().mockResolvedValue(true)
                vi.doMock("@effect/cli", async () => {
                    const actual = await vi.importActual("@effect/cli") as any
                    return {
                        ...actual,
                        Prompt: {
                            confirm: promptSpy
                        }
                    }
                })

                const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { })

                const result = yield* Effect.either(
                    clearCommand.handler({})
                )

                expect(Either.isRight(result)).toBe(true)

                // Verify log file is empty
                const logContent = yield* fs.readFileString(LOG_FILE)
                expect(logContent).toBe("")

                expect(consoleSpy).toHaveBeenCalledWith(`Log file cleared successfully: ${LOG_FILE}`)

                consoleSpy.mockRestore()
            }).pipe(Effect.provide(testLayer)))

        test("should handle missing log file in clear command", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem
                // Remove log file
                yield* fs.remove(LOG_FILE)

                // Mock the confirmation prompt to return true
                const promptSpy = vi.fn().mockResolvedValue(true)
                vi.doMock("@effect/cli", async () => {
                    const actual = await vi.importActual("@effect/cli") as any
                    return {
                        ...actual,
                        Prompt: {
                            confirm: promptSpy
                        }
                    }
                })

                const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { })

                const result = yield* Effect.either(
                    clearCommand.handler({})
                )

                expect(Either.isRight(result)).toBe(true)
                expect(consoleSpy).toHaveBeenCalledWith(
                    expect.stringContaining("Log file not found")
                )

                consoleSpy.mockRestore()
            }).pipe(Effect.provide(testLayer)))
    })

    describe("configuration validation", () => {
        test("should fail when master-config.json is missing", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem
                // Remove master config file
                yield* fs.remove(join(CONFIG_DIR, "master-config.json"))

                const result = yield* Effect.either(
                    viewCommand.handler({
                        head: Option.none(),
                        tail: Option.none()
                    })
                )

                expect(Either.isLeft(result)).toBe(true)
                if (Either.isLeft(result)) {
                    expect((result.left as Error).message).toContain("not found")
                }
            }).pipe(Effect.provide(testLayer)))

        test("should fail when master-config.json has invalid JSON", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem
                // Write invalid JSON
                yield* fs.writeFileString(
                    join(CONFIG_DIR, "master-config.json"),
                    "invalid json content"
                )

                const result = yield* Effect.either(
                    viewCommand.handler({
                        head: Option.none(),
                        tail: Option.none()
                    })
                )

                expect(Either.isLeft(result)).toBe(true)
                if (Either.isLeft(result)) {
                    expect((result.left as Error).message).toContain("Invalid JSON")
                }
            }).pipe(Effect.provide(testLayer)))

        test("should fail when logging.filePath is missing from config", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem
                // Write config without logging.filePath
                const configWithoutLogging = {
                    name: "Test Project",
                    version: "1.0.0"
                }
                yield* fs.writeFileString(
                    join(CONFIG_DIR, "master-config.json"),
                    JSON.stringify(configWithoutLogging, null, 2)
                )

                const result = yield* Effect.either(
                    viewCommand.handler({
                        head: Option.none(),
                        tail: Option.none()
                    })
                )

                expect(Either.isLeft(result)).toBe(true)
                if (Either.isLeft(result)) {
                    expect((result.left as Error).message).toContain("not configured")
                }
            }).pipe(Effect.provide(testLayer)))
    })

    describe("error handling", () => {
        test("should handle missing ea-config directory", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem
                // Remove entire config directory
                yield* fs.remove(CONFIG_DIR, { recursive: true })

                const result = yield* Effect.either(
                    viewCommand.handler({
                        head: Option.none(),
                        tail: Option.none()
                    })
                )

                expect(Either.isLeft(result)).toBe(true)
                if (Either.isLeft(result)) {
                    expect((result.left as Error).message).toContain("not found")
                }
            }).pipe(Effect.provide(testLayer)))

        test("should handle file system permissions error", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem

                // Create a config file with valid structure but simulate permission error
                // by writing to a location that might cause permission issues
                const restrictedConfig = {
                    name: "Test Project",
                    version: "1.0.0",
                    logging: {
                        filePath: "/root/restricted.log", // This would cause permission error
                        level: "info"
                    }
                }

                yield* fs.writeFileString(
                    join(CONFIG_DIR, "master-config.json"),
                    JSON.stringify(restrictedConfig, null, 2)
                )

                const result = yield* Effect.either(
                    viewCommand.handler({
                        head: Option.none(),
                        tail: Option.none()
                    })
                )

                expect(Either.isLeft(result)).toBe(true)
            }).pipe(Effect.provide(testLayer)))
    })
})
