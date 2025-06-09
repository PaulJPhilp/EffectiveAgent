import { FileSystem } from "@effect/platform"
import { NodeContext, NodeFileSystem } from "@effect/platform-node"
import { Effect, Either, Layer } from "effect"
import { join } from "path"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { ServeCommand } from "../serve.js"

describe("serve command functionality", () => {
    const TEST_DIR = join(process.cwd(), "test-workspace-serve")
    const PROJECT_NAME = "test-serve-project"
    const PROJECT_PATH = join(TEST_DIR, PROJECT_NAME)
    const CONFIG_DIR = join(PROJECT_PATH, "ea-config")
    const AGENTS_DIR = join(PROJECT_PATH, "agents")
    const AGENT_NAME = "test-agent"
    const AGENT_DIR = join(AGENTS_DIR, AGENT_NAME)

    // Test layer
    const testLayer = Layer.mergeAll(
        NodeFileSystem.layer,
        NodeContext.layer
    )

    // Valid configuration files
    const validModelsConfig = {
        name: "Test Models Config",
        version: "1.0.0",
        models: [
            {
                id: "gpt-4",
                name: "GPT-4",
                provider: "openai"
            }
        ]
    }

    const validProvidersConfig = {
        version: "1.0.0",
        name: "test-providers",
        description: "Test providers",
        providers: [
            {
                name: "openai",
                type: "openai",
                apiKey: "test-key"
            }
        ]
    }

    const validPolicyConfig = {
        name: "Test-Policy-Config",
        version: "1.0.0",
        policies: [
            {
                name: "default",
                rules: []
            }
        ]
    }

    const validAgentPackage = {
        name: "test-agent",
        version: "1.0.0",
        main: "index.js"
    }

    beforeEach(async () => {
        await Effect.runPromise(
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem

                // Create test directories
                yield* Effect.all([
                    fs.makeDirectory(TEST_DIR, { recursive: true }),
                    fs.makeDirectory(PROJECT_PATH, { recursive: true }),
                    fs.makeDirectory(CONFIG_DIR, { recursive: true }),
                    fs.makeDirectory(AGENTS_DIR, { recursive: true }),
                    fs.makeDirectory(AGENT_DIR, { recursive: true }),
                ])

                // Create required config files
                yield* Effect.all([
                    fs.writeFileString(
                        join(CONFIG_DIR, "models.json"),
                        JSON.stringify(validModelsConfig, null, 2)
                    ),
                    fs.writeFileString(
                        join(CONFIG_DIR, "providers.json"),
                        JSON.stringify(validProvidersConfig, null, 2)
                    ),
                    fs.writeFileString(
                        join(CONFIG_DIR, "policy.json"),
                        JSON.stringify(validPolicyConfig, null, 2)
                    ),
                ])

                // Create agent package.json
                yield* fs.writeFileString(
                    join(AGENT_DIR, "package.json"),
                    JSON.stringify(validAgentPackage, null, 2)
                )

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

    describe("command validation", () => {
        test("should validate agent exists", () =>
            Effect.gen(function* () {
                const result = yield* Effect.either(
                    ServeCommand.handler({
                        agentName: "non-existent-agent",
                        port: 8081,
                        host: "127.0.0.1"
                    })
                )

                expect(Either.isLeft(result)).toBe(true)
                if (Either.isLeft(result)) {
                    expect((result.left as Error).message).toContain("not found")
                }
            }).pipe(Effect.provide(testLayer)))

        test("should validate configuration files exist", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem
                // Remove models.json to cause validation failure
                yield* fs.remove(join(CONFIG_DIR, "models.json"))

                const result = yield* Effect.either(
                    ServeCommand.handler({
                        agentName: AGENT_NAME,
                        port: 8081,
                        host: "127.0.0.1"
                    })
                )

                expect(Either.isLeft(result)).toBe(true)
                if (Either.isLeft(result)) {
                    expect((result.left as Error).message).toContain("models.json")
                }
            }).pipe(Effect.provide(testLayer)))

        test("should validate providers.json exists", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem
                // Remove providers.json to cause validation failure
                yield* fs.remove(join(CONFIG_DIR, "providers.json"))

                const result = yield* Effect.either(
                    ServeCommand.handler({
                        agentName: AGENT_NAME,
                        port: 8081,
                        host: "127.0.0.1"
                    })
                )

                expect(Either.isLeft(result)).toBe(true)
                if (Either.isLeft(result)) {
                    expect((result.left as Error).message).toContain("providers.json")
                }
            }).pipe(Effect.provide(testLayer)))

        test("should validate policy.json exists", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem
                // Remove policy.json to cause validation failure
                yield* fs.remove(join(CONFIG_DIR, "policy.json"))

                const result = yield* Effect.either(
                    ServeCommand.handler({
                        agentName: AGENT_NAME,
                        port: 8081,
                        host: "127.0.0.1"
                    })
                )

                expect(Either.isLeft(result)).toBe(true)
                if (Either.isLeft(result)) {
                    expect((result.left as Error).message).toContain("policy.json")
                }
            }).pipe(Effect.provide(testLayer)))

        test("should validate agent package.json exists", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem
                // Remove agent package.json to cause validation failure
                yield* fs.remove(join(AGENT_DIR, "package.json"))

                const result = yield* Effect.either(
                    ServeCommand.handler({
                        agentName: AGENT_NAME,
                        port: 8081,
                        host: "127.0.0.1"
                    })
                )

                expect(Either.isLeft(result)).toBe(true)
                if (Either.isLeft(result)) {
                    expect((result.left as Error).message).toContain("package.json")
                }
            }).pipe(Effect.provide(testLayer)))
    })

    describe("command arguments", () => {
        test("should accept valid agent name", () =>
            Effect.gen(function* () {
                // This test validates that the command accepts the agent name
                // We expect it to fail at server startup (not validation)
                const result = yield* Effect.either(
                    ServeCommand.handler({
                        agentName: AGENT_NAME,
                        port: 8081,
                        host: "127.0.0.1"
                    })
                )

                // Should pass validation but fail at server startup
                expect(Either.isLeft(result)).toBe(true)
                if (Either.isLeft(result)) {
                    // Should not be a validation error about missing agent
                    expect((result.left as Error).message).not.toContain("not found")
                }
            }).pipe(Effect.provide(testLayer)))

        test("should handle custom port parameter", () =>
            Effect.gen(function* () {
                const result = yield* Effect.either(
                    ServeCommand.handler({
                        agentName: AGENT_NAME,
                        port: 9000,
                        host: "127.0.0.1"
                    })
                )

                expect(Either.isLeft(result)).toBe(true)
                if (Either.isLeft(result)) {
                    expect((result.left as Error).message).not.toContain("not found")
                }
            }).pipe(Effect.provide(testLayer)))

        test("should handle custom host parameter", () =>
            Effect.gen(function* () {
                const result = yield* Effect.either(
                    ServeCommand.handler({
                        agentName: AGENT_NAME,
                        port: 8081,
                        host: "localhost"
                    })
                )

                expect(Either.isLeft(result)).toBe(true)
                if (Either.isLeft(result)) {
                    expect((result.left as Error).message).not.toContain("not found")
                }
            }).pipe(Effect.provide(testLayer)))
    })

    describe("error handling", () => {
        test("should handle missing agents directory", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem
                // Remove entire agents directory
                yield* fs.remove(AGENTS_DIR, { recursive: true })

                const result = yield* Effect.either(
                    ServeCommand.handler({
                        agentName: AGENT_NAME,
                        port: 8081,
                        host: "127.0.0.1"
                    })
                )

                expect(Either.isLeft(result)).toBe(true)
                if (Either.isLeft(result)) {
                    expect((result.left as Error).message).toContain("not found")
                }
            }).pipe(Effect.provide(testLayer)))

        test("should handle file system errors", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem

                // Create a config file with invalid structure to simulate errors
                const invalidConfig = {
                    name: "Test Project",
                    version: "1.0.0",
                    agents: {
                        filePath: "/nonexistent/path.log"
                    }
                }

                yield* fs.writeFileString(
                    join(CONFIG_DIR, "models.json"),
                    JSON.stringify(invalidConfig, null, 2)
                )

                const result = yield* Effect.either(
                    ServeCommand.handler({
                        agentName: AGENT_NAME,
                        port: 8081,
                        host: "127.0.0.1"
                    })
                )

                expect(Either.isLeft(result)).toBe(true)
            }).pipe(Effect.provide(testLayer)))
    })
})
