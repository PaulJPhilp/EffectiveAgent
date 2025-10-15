import { mkdirSync, mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs"
import * as os from "node:os"
import { join } from "node:path"
import { NodeFileSystem, NodePath, NodeTerminal } from "@effect/platform-node"
import { Effect, } from "effect"
import { afterEach, beforeEach, describe, expect, it, } from "vitest"
import { ModelService } from "@/services/ai/model/service.js"
import { PolicyService } from "@/services/ai/policy/service.js"
import { ProviderService } from "@/services/ai/provider/service.js"
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js";
import { ConfigurationService } from "@/services/core/configuration/index.js"
import { AgentRuntimeService } from "../service.js";
import { AgentRecordType, makeAgentRuntimeId } from "../types.js"

describe("AgentRuntime", () => {
    it("should have .Default available", () => {
        expect(AgentRuntimeService.Default).toBeDefined();
    });

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
        } catch (_error) {
            // Ignore cleanup errors
        }

        // Reset environment
        process.env = { ...originalEnv }
    })

    it("basic lifecycle operations", () => 
        Effect.gen(function* () {
            // Create test configuration
            const masterConfig = JSON.parse(JSON.stringify(validMasterConfig))
            masterConfig.configPaths.models = modelsConfigPath
            masterConfig.configPaths.providers = providersConfigPath
            masterConfig.configPaths.policy = policyConfigPath

            // Write configuration files
            writeFileSync(masterConfigPath, JSON.stringify(masterConfig, null, 2))
            writeFileSync(providersConfigPath, JSON.stringify(validProviderConfig, null, 2))
            writeFileSync(modelsConfigPath, JSON.stringify(validModelConfig, null, 2))
            writeFileSync(policyConfigPath, JSON.stringify(validPolicyConfig, null, 2))

            // Set environment variable
            process.env.MASTER_CONFIG_PATH = masterConfigPath

            // Get service and create test agent
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

            // Get updated state and verify count increment
            const updatedState = yield* service.getState(id)
            expect((updatedState.state as { count: number }).count).toBe(1)

            // Terminate
            yield* service.terminate(id)

            // Verify terminated - should fail when trying to get state
            const stateResult = yield* Effect.either(service.getState(id))
            expect(stateResult._tag).toBe("Left")
        }).pipe(
            Effect.provide(AgentRuntimeService.Default),
            Effect.provide(ModelService.Default),
            Effect.provide(ProviderService.Default),
            Effect.provide(PolicyService.Default),
            Effect.provide(ToolRegistryService.Default),
            Effect.provide(ConfigurationService.Default),
            Effect.provide(NodeFileSystem.layer),
            Effect.provide(NodePath.layer),
            Effect.provide(NodeTerminal.layer)
        )
    );
});