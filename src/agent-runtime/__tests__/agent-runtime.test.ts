import { mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "fs"
import { join } from "path"
import { ModelService } from "@/services/ai/model/service.js"
import { PolicyService } from "@/services/ai/policy/service.js"
import { ProviderService } from "@/services/ai/provider/service.js"
import { ConfigurationService } from "@/services/core/configuration/service.js"
import { NodeFileSystem } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { AgentRecordType, AgentRuntimeService, makeAgentRuntimeId } from "../index.js"

describe("AgentRuntime", () => {
    const testDir = join(process.cwd(), "test-agent-runtime-configs")
    const masterConfigPath = join(testDir, "master-config.json")
    const providersConfigPath = join(testDir, "providers.json")
    const modelsConfigPath = join(testDir, "models.json")
    const policyConfigPath = join(testDir, "policy.json")

    const validMasterConfig = {
        runtimeSettings: {
            fileSystemImplementation: "node" as const
        },
        logging: {
            level: "info" as const,
            filePath: "./logs/test.log",
            enableConsole: true
        },
        agents: {
            agentsDirectory: "./agents",
            modelsConfigPath: modelsConfigPath,
            providersConfigPath: providersConfigPath,
            policiesConfigPath: policyConfigPath
        }
    }

    const validProviderConfig = {
        name: "Test-Providers-Config",
        version: "1.0.0",
        description: "Test providers",
        providers: [
            {
                name: "openai",
                displayName: "OpenAI",
                type: "llm",
                apiKeyEnvVar: "OPENAI_API_KEY",
                baseUrl: "https://api.openai.com/v1",
                capabilities: ["chat", "text-generation"]
            }
        ]
    }

    const validModelConfig = {
        name: "Test Models Config",
        version: "1.0.0",
        models: [
            {
                id: "gpt-4o",
                displayName: "GPT-4 Omni",
                provider: {
                    name: "openai",
                    displayName: "OpenAI"
                },
                vendorCapabilities: ["chat", "text-generation"],
                contextWindow: 128000,
                maxTokens: 4096
            }
        ]
    }

    const validPolicyConfig = {
        name: "Test-Policy-Config",
        version: "1.0.0",
        policies: [
            {
                id: "test-rule",
                name: "Test Rule",
                type: "allow",
                resource: "*",
                priority: 100,
                enabled: true,
                description: "A test policy rule"
            }
        ]
    }

    // Store original env vars
    const originalEnv = { ...process.env }

    beforeEach(() => {
        // Create test directory and files
        mkdirSync(testDir, { recursive: true })
        writeFileSync(masterConfigPath, JSON.stringify(validMasterConfig, null, 2))
        writeFileSync(providersConfigPath, JSON.stringify(validProviderConfig, null, 2))
        writeFileSync(modelsConfigPath, JSON.stringify(validModelConfig, null, 2))
        writeFileSync(policyConfigPath, JSON.stringify(validPolicyConfig, null, 2))

        // Set up environment
        process.env.MASTER_CONFIG_PATH = masterConfigPath
        process.env.OPENAI_API_KEY = "test-key"
    })

    afterEach(() => {
        // Clean up test files
        try {
            unlinkSync(masterConfigPath)
            unlinkSync(providersConfigPath)
            unlinkSync(modelsConfigPath)
            unlinkSync(policyConfigPath)
            rmdirSync(testDir)
        } catch (error) {
            // Ignore cleanup errors
        }

        // Reset environment
        process.env = { ...originalEnv }
    })

    test("basic lifecycle operations", async () => {
        await Effect.runPromise(
            Effect.provide(
                Effect.gen(function* () {
                    const service = yield* AgentRuntimeService
                    const id = makeAgentRuntimeId("test-agent")

                    // Create agent runtime
                    const runtime = yield* service.create(id, { count: 0 })
                    expect(runtime).toBeDefined()
                    expect(runtime.id).toBe(id)

                    // Get initial state
                    const initialState = yield* service.getState(id)
                    expect(initialState.state).toEqual({ count: 0 })
                    expect(initialState.status).toBe("IDLE")

                    // Send a record
                    const record = {
                        id: "test-record",
                        agentRuntimeId: id,
                        timestamp: Date.now(),
                        type: AgentRecordType.COMMAND,
                        payload: { increment: 1 },
                        metadata: {},
                        sequence: 1
                    }

                    yield* service.send(id, record)

                    // Terminate
                    yield* service.terminate(id)

                    // Verify terminated - should fail when trying to get state
                    const stateResult = yield* Effect.either(service.getState(id))
                    expect(stateResult._tag).toBe("Left")
                }),
                Layer.mergeAll(
                    ConfigurationService.Default,
                    ProviderService.Default,
                    ModelService.Default,
                    PolicyService.Default,
                    AgentRuntimeService.Default,
                    NodeFileSystem.layer
                )
            )
        )
    })
})