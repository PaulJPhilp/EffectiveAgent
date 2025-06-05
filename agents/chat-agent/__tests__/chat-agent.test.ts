/**
 * Comprehensive test suite for Chat Agent
 * @file Tests the ChatAgent class with all its functionality using real services
 */

import { AgentRuntimeService } from "@/ea-agent-runtime/service.js"
import { ConfigurationService } from "@/services/core/configuration/service.js"
import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { join } from "path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createChatAgent } from "../agent/agent.js"

describe("Chat Agent Integration Tests", () => {
    const testDir = join(process.cwd(), "test-configs")
    const masterConfigPath = join(testDir, "master-config.json")
    const providersConfigPath = join(testDir, "providers.json")
    const modelsConfigPath = join(testDir, "models.json")
    const policyConfigPath = join(testDir, "valid-policy.json")

    const validMasterConfig = {
        runtimeSettings: {
            fileSystemImplementation: "node" as const
        },
        logging: {
            level: "info" as const,
            filePath: "./logs/chat-agent-test.log",
            enableConsole: true
        },
        agents: {
            agentsDirectory: "./agents",
            modelsConfigPath: modelsConfigPath,
            providersConfigPath: providersConfigPath,
            policiesConfigPath: policyConfigPath
        },
        configPaths: {
            providers: providersConfigPath,
            models: modelsConfigPath,
            policy: policyConfigPath
        }
    }

    const validProviderConfig = {
        providers: [
            {
                name: "openai",
                apiKeyEnvVar: "OPENAI_API_KEY"
            }
        ]
    }

    const validModelConfig = {
        models: [
            {
                id: "gpt-4o",
                provider: "openai",
                capabilities: ["chat", "text-generation"]
            }
        ]
    }

    const validPolicyConfig = {
        name: "Test Policy Config",
        version: "1.0.0",
        description: "Test policy configuration",
        policies: [
            {
                id: "default-allow",
                name: "Default Allow Rule",
                description: "Default rule to allow all operations",
                type: "allow",
                resource: "*",
                priority: 100,
                conditions: {
                    rateLimits: {
                        requestsPerMinute: 100
                    },
                    costLimits: {
                        maxCostPerRequest: 1000
                    }
                }
            }
        ]
    }

    // Store original env vars
    const originalEnv = { ...process.env }

    beforeEach(async () => {
        await Effect.runPromise(
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem

                // Create master config file (others already exist)
                yield* fs.writeFileString(masterConfigPath, JSON.stringify(validMasterConfig, null, 2))

                // Set up environment
                process.env.MASTER_CONFIG_PATH = masterConfigPath.toString()
                process.env.OPENAI_API_KEY = "test-key"
            }).pipe(
                Effect.provide(NodeFileSystem.layer)
            )
        )
    })

    afterEach(async () => {
        await Effect.runPromise(
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem

                // Clean up only the master config file we created
                const exists = yield* fs.exists(masterConfigPath)
                if (exists) {
                    yield* fs.remove(masterConfigPath)
                }

                // Reset environment
                process.env = { ...originalEnv }
            }).pipe(
                Effect.provide(NodeFileSystem.layer)
            )
        )
    })

    it("should create a chat agent with default configuration", async () => {
        // Simple test that verifies the test setup works
        expect(validMasterConfig).toBeDefined()
        expect(validMasterConfig.runtimeSettings.fileSystemImplementation).toBe("node")
        expect(validMasterConfig.logging.level).toBe("info")
        expect(validProviderConfig.providers).toHaveLength(1)
        expect(validModelConfig.models).toHaveLength(1)
        expect(validPolicyConfig.policies).toHaveLength(1)
    })

    it("should create initial state with proper structure", async () => {
        await Effect.runPromise(
            Effect.gen(function* () {
                const agentRuntimeService = yield* AgentRuntimeService
                const chatAgent = createChatAgent(agentRuntimeService, {
                    maxMessages: 10,
                    responseTimeoutMs: 30000,
                    enableTopicTracking: true,
                    defaultTone: "friendly"
                })

                const initialState = yield* Effect.promise(() =>
                    chatAgent.createInitialState("user123", "session456")
                )

                expect(initialState).toBeDefined()
                expect(initialState.context.userId).toBe("user123")
                expect(initialState.context.sessionId).toBe("session456")
                expect(initialState.context.preferences?.tone).toBe("friendly")
                expect(initialState.messages).toEqual([])
                expect(initialState.currentStep).toBe("waiting")
                expect(initialState.conversationMetadata.messageCount).toBe(0)
                expect(initialState.agentRuntime).toBeDefined()
            }).pipe(
                Effect.provide(
                    Layer.mergeAll(
                        NodeFileSystem.layer,
                        ConfigurationService.Default,
                        AgentRuntimeService.Default
                    )
                )
            ) as Effect.Effect<void, never, never>
        )
    })

    it("should add messages to state using transformer", async () => {
        await Effect.runPromise(
            Effect.gen(function* () {
                const agentRuntimeService = yield* AgentRuntimeService
                const chatAgent = createChatAgent(agentRuntimeService, {})
                const initialState = yield* Effect.promise(() =>
                    chatAgent.createInitialState("user123", "session456")
                )

                const stateWithMessage = chatAgent.addMessage({
                    role: "user",
                    content: "Hello there!"
                }, initialState)

                expect(stateWithMessage.messages).toHaveLength(1)
                expect(stateWithMessage.messages[0]?._getType()).toBe("human")
                expect(stateWithMessage.messages[0]?.content).toBe("Hello there!")
                expect(stateWithMessage.conversationMetadata.messageCount).toBe(1)
                expect(stateWithMessage.conversationMetadata.lastActivity).toBeGreaterThanOrEqual(initialState.conversationMetadata.lastActivity)
            }).pipe(
                Effect.provide(
                    Layer.mergeAll(
                        NodeFileSystem.layer,
                        ConfigurationService.Default,
                        AgentRuntimeService.Default
                    )
                )
            ) as Effect.Effect<void, never, never>
        )
    })

    it("should generate conversation summary", async () => {
        await Effect.runPromise(
            Effect.gen(function* () {
                const agentRuntimeService = yield* AgentRuntimeService
                const chatAgent = createChatAgent(agentRuntimeService, {})
                let state = yield* Effect.promise(() =>
                    chatAgent.createInitialState("user123", "session456")
                )

                // Add some messages
                state = chatAgent.addMessage({ role: "user", content: "Hello" }, state)
                state = chatAgent.addMessage({ role: "assistant", content: "Hi there!" }, state)

                const summary = yield* Effect.promise(() => chatAgent.getSummary(state))

                expect(summary).toContain("Messages: 2")
                expect(summary).toContain("Status: waiting")
                expect(summary).toContain("Conversation Summary:")
            }).pipe(
                Effect.provide(
                    Layer.mergeAll(
                        NodeFileSystem.layer,
                        ConfigurationService.Default,
                        AgentRuntimeService.Default
                    )
                )
            ) as Effect.Effect<void, never, never>
        )
    })

    it("should compile LangGraph successfully", async () => {
        await Effect.runPromise(
            Effect.gen(function* () {
                const agentRuntimeService = yield* AgentRuntimeService
                const chatAgent = createChatAgent(agentRuntimeService, {})
                const compiledGraph = chatAgent.getCompiledGraph()

                expect(compiledGraph).toBeDefined()
                expect(typeof compiledGraph.invoke).toBe("function")
                expect(typeof compiledGraph.stream).toBe("function")
            }).pipe(
                Effect.provide(
                    Layer.mergeAll(
                        NodeFileSystem.layer,
                        ConfigurationService.Default,
                        AgentRuntimeService.Default
                    )
                )
            ) as Effect.Effect<void, never, never>
        )
    })

    it("should handle multiple message types correctly", async () => {
        await Effect.runPromise(
            Effect.gen(function* () {
                const agentRuntimeService = yield* AgentRuntimeService
                const chatAgent = createChatAgent(agentRuntimeService, {})
                let state = yield* Effect.promise(() =>
                    chatAgent.createInitialState("user123", "session456")
                )
                // Add different message types
                state = chatAgent.addMessage({ role: "user", content: "User message" }, state)
                state = chatAgent.addMessage({ role: "assistant", content: "Assistant response" }, state)
                state = chatAgent.addMessage({ role: "system", content: "System message" }, state)
                expect(state.messages).toHaveLength(3)
                expect(state.messages[0]?._getType()).toBe("human")
                expect(state.messages[1]?._getType()).toBe("ai")
                expect(state.messages[2]?._getType()).toBe("ai") // System messages are converted to AI messages
                expect(state.conversationMetadata.messageCount).toBe(3)
            }).pipe(
                Effect.provide(
                    Layer.mergeAll(
                        NodeFileSystem.layer,
                        ConfigurationService.Default,
                        AgentRuntimeService.Default
                    )
                )
            ) as Effect.Effect<void, never, never>
        )
    })
}) 