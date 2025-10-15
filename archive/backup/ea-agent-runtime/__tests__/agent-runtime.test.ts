import { NodeFileSystem } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { mkdirSync, mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from "fs"
import * as os from "os"
import { join } from "path"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { ModelService } from "@/services/ai/model/service.js"
import { PolicyService } from "@/services/ai/policy/service.js"
import { ProviderService } from "@/services/ai/provider/service.js"
import { ConfigurationService } from "@/services/core/configuration/service.js"
import { AgentRuntimeService } from "../service.js"
import { makeAgentRuntimeId } from "../types.js"

describe("AgentRuntime", () => {
    let testDir: string
    let masterConfigPath: string
    let providersConfigPath: string
    let modelsConfigPath: string
    let policyConfigPath: string

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
            modelsConfigPath: "",
            providersConfigPath: "",
            policiesConfigPath: ""
        },
        configPaths: {
            models: "",
            providers: "",
            policy: ""
        }
    }

    const validProviderConfig = {
        version: "1.0.0",
        description: "Test providers",
        name: "openai",
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
                name: "gpt-4-omni",
                displayName: "gpt-4-omni",
                version: "1.0.0",
                modelName: "gpt-4-omni",
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
        // Create a unique temp directory for this test
        testDir = mkdtempSync(join(os.tmpdir(), "agent-runtime-test-"))
        masterConfigPath = join(testDir, "master-config.json")
        providersConfigPath = join(testDir, "providers.json")
        modelsConfigPath = join(testDir, "models.json")
        policyConfigPath = join(testDir, "policy.json")

        // Patch config paths on a deep clone
        const masterConfig = JSON.parse(JSON.stringify(validMasterConfig))
        masterConfig.agents.modelsConfigPath = modelsConfigPath
        masterConfig.agents.providersConfigPath = providersConfigPath
        masterConfig.agents.policiesConfigPath = policyConfigPath
        masterConfig.configPaths.models = modelsConfigPath
        masterConfig.configPaths.providers = providersConfigPath
        masterConfig.configPaths.policy = policyConfigPath

        // Create test directory and files
        mkdirSync(testDir, { recursive: true })
        writeFileSync(masterConfigPath, JSON.stringify(masterConfig, null, 2))
        writeFileSync(providersConfigPath, JSON.stringify(JSON.parse(JSON.stringify(validProviderConfig)), null, 2))
        writeFileSync(modelsConfigPath, JSON.stringify(JSON.parse(JSON.stringify(validModelConfig)), null, 2))
        writeFileSync(policyConfigPath, JSON.stringify(JSON.parse(JSON.stringify(validPolicyConfig)), null, 2))

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

    const testLayer = Layer.mergeAll(
        ConfigurationService.Default,
        ProviderService.Default,
        ModelService.Default,
        PolicyService.Default,
        AgentRuntimeService.Default,
        NodeFileSystem.layer
    )

    test.skip("basic lifecycle operations", async () => {
        const masterConfig = JSON.parse(JSON.stringify(validMasterConfig))
        masterConfig.agents.modelsConfigPath = modelsConfigPath
        masterConfig.agents.providersConfigPath = providersConfigPath
        masterConfig.agents.policiesConfigPath = policyConfigPath
        masterConfig.configPaths.models = modelsConfigPath
        masterConfig.configPaths.providers = providersConfigPath
        masterConfig.configPaths.policy = policyConfigPath
        writeFileSync(masterConfigPath, JSON.stringify(masterConfig, null, 2))
        writeFileSync(providersConfigPath, JSON.stringify(JSON.parse(JSON.stringify(validProviderConfig)), null, 2))
        writeFileSync(modelsConfigPath, JSON.stringify(JSON.parse(JSON.stringify(validModelConfig)), null, 2))
        writeFileSync(policyConfigPath, JSON.stringify(JSON.parse(JSON.stringify(validPolicyConfig)), null, 2))
        process.env.MASTER_CONFIG_PATH = masterConfigPath
        // Debug: print env and config files
        console.log("[DEBUG] MASTER_CONFIG_PATH:", process.env.MASTER_CONFIG_PATH)
        console.log("[DEBUG] masterConfigPath contents:", require("fs").readFileSync(masterConfigPath, "utf8"))
        console.log("[DEBUG] providersConfigPath contents:", require("fs").readFileSync(providersConfigPath, "utf8"))
        await Effect.runPromise(
            Effect.provide(
                Effect.gen(function* () {
                    // Always yield a fresh ConfigurationService instance
                    const configService = yield* ConfigurationService;
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
                testLayer
            )
        )
    })
})