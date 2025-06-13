import { NodeContext, NodeFileSystem } from "@effect/platform-node"
import { FileSystem } from "@effect/platform"
import { Effect, Either, Layer } from "effect"
import { join } from "path"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { createAgent } from "../../boilerplate/agent.js"
import { addConfigItem } from "../../utils/config-helpers.js"

describe("add command functionality", () => {
    const TEST_DIR = join(process.cwd(), "test-workspace-add")
    const PROJECT_NAME = "test-add-project"
    const PROJECT_PATH = join(TEST_DIR, PROJECT_NAME)
    const CONFIG_DIR = join(PROJECT_PATH, "ea-config")
    const AGENTS_DIR = join(PROJECT_PATH, "agents")

    // Test layer
    const testLayer = Layer.mergeAll(
        NodeFileSystem.layer,
        NodeContext.layer
    )

    // Test configurations
    const validModelsConfig = {
        name: "Test Models Config",
        version: "1.0.0",
        models: []
    }

    const validProvidersConfig = {
        version: "1.0.0",
        name: "test-providers",
        description: "Test providers",
        providers: []
    }

    const validPolicyConfig = {
        name: "Test-Policy-Config",
        version: "1.0.0",
        policies: []
    }

    const validToolRegistryConfig = {
        name: "Test Tool Registry",
        version: "1.0.0",
        toolkits: []
    }

    beforeEach(async () => {
        await Effect.runPromise(
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem

                // Create test directories
                yield* Effect.all([
                    fs.makeDirectory(TEST_DIR),
                    fs.makeDirectory(PROJECT_PATH),
                    fs.makeDirectory(CONFIG_DIR),
                    fs.makeDirectory(AGENTS_DIR),
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
                    fs.writeFileString(
                        join(CONFIG_DIR, "tool-registry.json"),
                        JSON.stringify(validToolRegistryConfig, null, 2)
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
                yield* fs.remove(TEST_DIR, { recursive: true })
            }).pipe(Effect.provide(testLayer))
        )
    })

    describe("agent creation", () => {
        test("should create a new agent with valid name", () =>
            Effect.gen(function* () {
                const agentName = "test-agent"

                yield* createAgent(agentName)

                const fs = yield* FileSystem.FileSystem
                const agentDir = join(AGENTS_DIR, agentName)

                // Verify agent directory was created
                const agentExists = yield* fs.exists(agentDir)
                expect(agentExists).toBe(true)

                // Verify package.json was created
                const packageJsonExists = yield* fs.exists(join(agentDir, "package.json"))
                expect(packageJsonExists).toBe(true)

                // Verify package.json content
                const packageContent = yield* fs.readFileString(join(agentDir, "package.json"))
                const packageJson = JSON.parse(packageContent)
                expect(packageJson.name).toBe(agentName)
            }).pipe(Effect.provide(testLayer)))

        test("should fail if agent already exists", () =>
            Effect.gen(function* () {
                const agentName = "existing-agent"

                const fs = yield* FileSystem.FileSystem
                // Create agent directory first
                yield* fs.makeDirectory(join(AGENTS_DIR, agentName))

                const result = yield* Effect.either(createAgent(agentName))

                expect(Either.isLeft(result)).toBe(true)
                if (Either.isLeft(result)) {
                    expect(result.left.message).toContain("exists")
                }
            }).pipe(Effect.provide(testLayer)))
    })

    describe("config item addition", () => {
        test("should add a new model to models.json", () =>
            Effect.gen(function* () {
                const modelName = "test-model"
                const modelData = {
                    name: "Test Model",
                    displayName: "Test Model",
                    provider: "test-provider",
                    contextWindow: 4096,
                    maxTokens: 1024
                }

                yield* addConfigItem("model", modelName, modelData)

                const fs = yield* FileSystem.FileSystem
                const modelsContent = yield* fs.readFileString(join(CONFIG_DIR, "models.json"))
                const modelsConfig = JSON.parse(modelsContent)

                expect(modelsConfig.models).toHaveLength(1)
                expect(modelsConfig.models[0].id).toBe(modelName)
            }).pipe(Effect.provide(testLayer)))

        test("should add a new provider to providers.json", () =>
            Effect.gen(function* () {
                const providerName = "test-provider"
                const providerData = {
                    displayName: "Test Provider",
                    type: "llm",
                    apiKeyEnvVar: "TEST_API_KEY",
                    baseUrl: "https://api.test.com/v1"
                }

                yield* addConfigItem("provider", providerName, providerData)

                const fs = yield* FileSystem.FileSystem
                const providersContent = yield* fs.readFileString(join(CONFIG_DIR, "providers.json"))
                const providersConfig = JSON.parse(providersContent)

                expect(providersConfig.providers).toHaveLength(1)
                expect(providersConfig.providers[0].name).toBe(providerName)
            }).pipe(Effect.provide(testLayer)))

        test("should add a new rule to policy.json", () =>
            Effect.gen(function* () {
                const ruleName = "test-rule"
                const ruleData = {
                    name: "Test Rule",
                    type: "allow",
                    resource: "*",
                    priority: 100,
                    enabled: true,
                    description: "A test policy rule"
                }

                yield* addConfigItem("rule", ruleName, ruleData)

                const fs = yield* FileSystem.FileSystem
                const policyContent = yield* fs.readFileString(join(CONFIG_DIR, "policy.json"))
                const policyConfig = JSON.parse(policyContent)

                expect(policyConfig.policies).toHaveLength(1)
                expect(policyConfig.policies[0].id).toBe(ruleName)
            }).pipe(Effect.provide(testLayer)))

        test("should add a new toolkit to tool-registry.json", () =>
            Effect.gen(function* () {
                const toolkitName = "test-toolkit"
                const toolkitData = {
                    displayName: "Test Toolkit",
                    description: "A test toolkit for testing",
                    version: "1.0.0",
                    tools: ["test-tool-1", "test-tool-2"]
                }

                yield* addConfigItem("toolkit", toolkitName, toolkitData)

                const fs = yield* FileSystem.FileSystem
                const toolRegistryContent = yield* fs.readFileString(join(CONFIG_DIR, "tool-registry.json"))
                const toolRegistryConfig = JSON.parse(toolRegistryContent)

                expect(toolRegistryConfig.toolkits).toHaveLength(1)
                expect(toolRegistryConfig.toolkits[0].name).toBe(toolkitName)
            }).pipe(Effect.provide(testLayer)))

        test("should handle invalid configuration files", () =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem
                // Write invalid JSON
                yield* fs.writeFileString(join(CONFIG_DIR, "models.json"), "invalid json")

                const result = yield* Effect.either(addConfigItem("model", "test-model", { name: "Test Model" }))

                expect(Either.isLeft(result)).toBe(true)
            }).pipe(Effect.provide(testLayer)))
    })
})
