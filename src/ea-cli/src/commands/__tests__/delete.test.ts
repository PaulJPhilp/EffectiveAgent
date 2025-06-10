import { join } from "path"
import { FileSystem } from "@effect/platform"
import { NodeContext, NodeFileSystem } from "@effect/platform-node"
import { Effect, Either, Layer } from "effect"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { ConfigurationError, ResourceNotFoundError } from "../../errors.js"
import { deleteConfigItem } from "../../utils/config-helpers.js"

describe("delete command functionality", () => {
    const TEST_DIR = join(process.cwd(), "test-workspace-delete")
    const PROJECT_NAME = "test-delete-project"
    const PROJECT_PATH = join(TEST_DIR, PROJECT_NAME)
    const CONFIG_DIR = join(PROJECT_PATH, "ea-config")
    const AGENTS_DIR = join(PROJECT_PATH, "agents")

    // Test layer
    const testLayer = Layer.mergeAll(
        NodeFileSystem.layer,
        NodeContext.layer
    )

    // Test configurations with sample data
    const modelsConfig = {
        name: "Test Models Config",
        version: "1.0.0",
        models: [
            {
                id: "gpt-4",
                name: "gpt-4",
                displayName: "GPT-4",
                version: "1.0.0",
                modelName: "gpt-4",
                provider: { name: "openai", displayName: "OpenAI" },
                vendorCapabilities: ["chat"],
                contextWindow: 128000,
                maxTokens: 4096
            },
            {
                id: "claude-3",
                name: "claude-3",
                displayName: "Claude 3",
                version: "1.0.0",
                modelName: "claude-3-sonnet",
                provider: { name: "anthropic", displayName: "Anthropic" },
                vendorCapabilities: ["chat"],
                contextWindow: 200000,
                maxTokens: 4096
            }
        ]
    }

    const providersConfig = {
        version: "1.0.0",
        name: "test-providers",
        description: "Test providers",
        providers: [
            {
                name: "openai",
                displayName: "OpenAI",
                type: "llm",
                apiKeyEnvVar: "OPENAI_API_KEY",
                baseUrl: "https://api.openai.com/v1",
                capabilities: ["chat"]
            },
            {
                name: "anthropic",
                displayName: "Anthropic",
                type: "llm",
                apiKeyEnvVar: "ANTHROPIC_API_KEY",
                baseUrl: "https://api.anthropic.com",
                capabilities: ["chat"]
            }
        ]
    }

    const policyConfig = {
        name: "Test-Policy-Config",
        version: "1.0.0",
        policies: [
            {
                id: "test-rule-1",
                name: "Test Rule 1",
                type: "allow",
                resource: "*",
                priority: 100,
                enabled: true,
                description: "A test policy rule"
            },
            {
                id: "test-rule-2",
                name: "Test Rule 2",
                type: "deny",
                resource: "admin/*",
                priority: 200,
                enabled: true,
                description: "Another test policy rule"
            }
        ]
    }

    const toolRegistryConfig = {
        name: "Test Tool Registry",
        version: "1.0.0",
        toolkits: [
            {
                name: "web-toolkit",
                displayName: "Web Toolkit",
                description: "Tools for web interactions",
                version: "1.0.0",
                tools: ["fetch", "scrape"]
            },
            {
                name: "file-toolkit",
                displayName: "File Toolkit",
                description: "Tools for file operations",
                version: "1.0.0",
                tools: ["read", "write"]
            }
        ]
    }

    beforeEach(async () => {
        await Effect.runPromise(
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem

                // Clean up any existing test directory first
                const testDirExists = yield* fs.exists(TEST_DIR)
                if (testDirExists) {
                    yield* fs.remove(TEST_DIR, { recursive: true })
                }

                // Create test directories
                yield* fs.makeDirectory(TEST_DIR, { recursive: true })
                yield* fs.makeDirectory(PROJECT_PATH, { recursive: true })
                yield* fs.makeDirectory(CONFIG_DIR, { recursive: true })
                yield* fs.makeDirectory(AGENTS_DIR, { recursive: true })

                // Create sample agent directories with content
                yield* fs.makeDirectory(join(AGENTS_DIR, "chat-agent"), { recursive: true })
                yield* fs.makeDirectory(join(AGENTS_DIR, "weather-agent"), { recursive: true })

                // Create package.json files for agents
                const chatAgentPackage = {
                    name: "chat-agent",
                    version: "1.0.0",
                    description: "A chat agent"
                }

                const weatherAgentPackage = {
                    name: "weather-agent",
                    version: "1.0.0",
                    description: "A weather agent"
                }

                yield* Effect.all([
                    fs.writeFileString(
                        join(AGENTS_DIR, "chat-agent", "package.json"),
                        JSON.stringify(chatAgentPackage, null, 2)
                    ),
                    fs.writeFileString(
                        join(AGENTS_DIR, "weather-agent", "package.json"),
                        JSON.stringify(weatherAgentPackage, null, 2)
                    ),
                ])

                // Create config files with sample data
                yield* Effect.all([
                    fs.writeFileString(
                        join(CONFIG_DIR, "models.json"),
                        JSON.stringify(modelsConfig, null, 2)
                    ),
                    fs.writeFileString(
                        join(CONFIG_DIR, "providers.json"),
                        JSON.stringify(providersConfig, null, 2)
                    ),
                    fs.writeFileString(
                        join(CONFIG_DIR, "policy.json"),
                        JSON.stringify(policyConfig, null, 2)
                    ),
                    fs.writeFileString(
                        join(CONFIG_DIR, "tool-registry.json"),
                        JSON.stringify(toolRegistryConfig, null, 2)
                    ),
                ])

                // Change to project directory
                process.chdir(PROJECT_PATH)
            }).pipe(Effect.provide(testLayer))
        )
    })

    afterEach(async () => {
        await Effect.runPromise(
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem

                // Restore original working directory if it was changed
                const originalCwd = process.cwd()
                if (originalCwd.includes(PROJECT_PATH)) {
                    process.chdir("/Users/paul/Projects/EffectiveAgent/src/ea-cli")
                }

                // Remove test directory if it exists
                const testDirExists = yield* fs.exists(TEST_DIR)
                if (testDirExists) {
                    yield* fs.remove(TEST_DIR, { recursive: true })
                }
            }).pipe(Effect.provide(testLayer))
        )
    })

    describe("delete agents", () => {
        test("should delete existing agent directory", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem
                const agentName = "chat-agent"
                const agentDir = join(AGENTS_DIR, agentName)

                // Verify agent exists before deletion
                const existsBefore = yield* fs.exists(agentDir)
                expect(existsBefore).toBe(true)

                // Delete agent directory
                yield* fs.remove(agentDir, { recursive: true })

                // Verify agent is deleted
                const existsAfter = yield* fs.exists(agentDir)
                expect(existsAfter).toBe(false)
            }).pipe(Effect.provide(testLayer)))

        test("should handle non-existent agent", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem
                const agentName = "non-existent-agent"
                const agentDir = join(AGENTS_DIR, agentName)

                const result = yield* Effect.either(
                    fs.remove(agentDir, { recursive: true })
                )

                expect(Either.isLeft(result)).toBe(true)
            }).pipe(Effect.provide(testLayer)))
    })

    describe("delete config items", () => {
        test("should delete existing model from models.json", () =>
            Effect.gen(function* () {
                // Delete the gpt-4 model
                yield* deleteConfigItem("model", "gpt-4")

                const fs = yield* FileSystem.FileSystem
                const modelsContent = yield* fs.readFileString(join(CONFIG_DIR, "models.json"))
                const updatedConfig = JSON.parse(modelsContent)

                // Should have one model left (claude-3)
                expect(updatedConfig.models).toHaveLength(1)
                expect(updatedConfig.models[0].id).toBe("claude-3")
            }).pipe(Effect.provide(testLayer)))

        test("should delete existing provider from providers.json", () =>
            Effect.gen(function* () {
                // Delete the openai provider
                yield* deleteConfigItem("provider", "openai")

                const fs = yield* FileSystem.FileSystem
                const providersContent = yield* fs.readFileString(join(CONFIG_DIR, "providers.json"))
                const updatedConfig = JSON.parse(providersContent)

                // Should have one provider left (anthropic)
                expect(updatedConfig.providers).toHaveLength(1)
                expect(updatedConfig.providers[0].name).toBe("anthropic")
            }).pipe(Effect.provide(testLayer)))

        test("should delete existing rule from policy.json", () =>
            Effect.gen(function* () {
                // Delete test-rule-1
                yield* deleteConfigItem("rule", "test-rule-1")

                const fs = yield* FileSystem.FileSystem
                const policyContent = yield* fs.readFileString(join(CONFIG_DIR, "policy.json"))
                const updatedConfig = JSON.parse(policyContent)

                // Should have one rule left (test-rule-2)
                expect(updatedConfig.policies).toHaveLength(1)
                expect(updatedConfig.policies[0].id).toBe("test-rule-2")
            }).pipe(Effect.provide(testLayer)))

        test("should delete existing toolkit from tool-registry.json", () =>
            Effect.gen(function* () {
                // Delete web-toolkit
                yield* deleteConfigItem("toolkit", "web-toolkit")

                const fs = yield* FileSystem.FileSystem
                const toolRegistryContent = yield* fs.readFileString(join(CONFIG_DIR, "tool-registry.json"))
                const updatedConfig = JSON.parse(toolRegistryContent)

                // Should have one toolkit left (file-toolkit)
                expect(updatedConfig.toolkits).toHaveLength(1)
                expect(updatedConfig.toolkits[0].name).toBe("file-toolkit")
            }).pipe(Effect.provide(testLayer)))

        test("should handle non-existent model deletion", () =>
            Effect.gen(function* () {
                const result = yield* Effect.either(
                    deleteConfigItem("model", "non-existent-model")
                )

                expect(Either.isLeft(result)).toBe(true)
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ResourceNotFoundError)
                }
            }).pipe(Effect.provide(testLayer)))

        test("should handle non-existent provider deletion", () =>
            Effect.gen(function* () {
                const result = yield* Effect.either(
                    deleteConfigItem("provider", "non-existent-provider")
                )

                expect(Either.isLeft(result)).toBe(true)
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ResourceNotFoundError)
                }
            }).pipe(Effect.provide(testLayer)))
    })

    describe("error handling", () => {
        test("should handle invalid JSON in config files", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem
                // Write invalid JSON
                yield* fs.writeFileString(join(CONFIG_DIR, "models.json"), "invalid json")

                const result = yield* Effect.either(
                    deleteConfigItem("model", "gpt-4")
                )

                expect(Either.isLeft(result)).toBe(true)
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ConfigurationError)
                }
            }).pipe(Effect.provide(testLayer)))

        test("should handle missing config files", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem
                // Remove config file
                yield* fs.remove(join(CONFIG_DIR, "models.json"))

                const result = yield* Effect.either(
                    deleteConfigItem("model", "gpt-4")
                )

                expect(Either.isLeft(result)).toBe(true)
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ConfigurationError)
                }
            }).pipe(Effect.provide(testLayer)))

        test("should handle missing config directory", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem
                // Remove entire config directory
                yield* fs.remove(CONFIG_DIR, { recursive: true })

                const result = yield* Effect.either(
                    deleteConfigItem("model", "gpt-4")
                )

                expect(Either.isLeft(result)).toBe(true)
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ConfigurationError)
                }
            }).pipe(Effect.provide(testLayer)))
    })
})
