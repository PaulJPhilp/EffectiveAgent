/**
 * Integration tests for EA SDK with complete workflows
 * @file Tests the full EA SDK integration with sample LangGraph agents
 */

import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import type { AgentRuntimeServiceApi } from "../../api.js"
import {
    createActivity,
    createStateTransformer,
    getStateProperty,
    runEffect,
    setStateProperty,
    validateStateStructure,
    wrapLangGraphNode
} from "../helpers.js"
import type { LangGraphAgentState } from "../types.js"

// Helper for getting provider client
const getProviderClient = (runtime: AgentRuntimeServiceApi, modelName: string) =>
    Effect.gen(function* () {
        const modelService = yield* runtime.getModelService()
        const providerName = yield* modelService.getProviderName(modelName)
        const providerService = yield* runtime.getProviderService()
        const providerClient = yield* providerService.getProviderClient(providerName)
        return providerClient
    })

// Mock AgentRuntimeServiceApi for integration testing
const createMockAgentRuntime = (): AgentRuntimeServiceApi => ({
    create: () => Effect.succeed({} as any),
    terminate: () => Effect.succeed(undefined),
    send: () => Effect.succeed(undefined),
    getState: () => Effect.succeed({} as any),
    subscribe: () => ({} as any),
    getModelService: () => Effect.succeed({
        generateResponse: (prompt: string) => Effect.succeed(`Response to: ${prompt}`),
        getModelInfo: () => Effect.succeed({ model: "test-model", provider: "test" }),
        getProviderName: (modelName: string) => Effect.succeed("openai")
    } as any),
    getProviderService: () => Effect.succeed({
        getProviderClient: (providerName: string) => Effect.succeed({
            generateText: (input: any, options: any) => Effect.succeed({
                data: { text: `Response to: ${input.messages[0].content}` },
                usage: { tokens: 10 }
            })
        } as any)
    } as any),
    getPolicyService: () => Effect.succeed({} as any),
    getToolRegistryService: () => Effect.succeed({} as any),
    getFileService: () => Effect.succeed({} as any),
    createLangGraphAgent: () => Effect.succeed({
        agentRuntime: {
            id: "test-agent-123" as any,
            send: () => Effect.succeed(undefined),
            getState: () => Effect.succeed({} as any),
            subscribe: () => ({} as any)
        },
        agentRuntimeId: "test-agent-123" as any
    }),
    run: <Output>(logicToRun: Effect.Effect<Output, any, any>) => Effect.runPromise(logicToRun as any)
})

// Sample agent state interfaces for different use cases
interface ChatAgentState extends LangGraphAgentState<{ userId: string; sessionId: string }> {
    messages: Array<{
        id: string
        role: "user" | "assistant" | "system"
        content: string
        timestamp: number
    }>
    currentStep: "waiting" | "processing" | "responding" | "completed"
    metadata: {
        messageCount: number
        lastActivity: number
    }
}

interface WorkflowAgentState extends LangGraphAgentState<{ workflowId: string; userId: string }> {
    tasks: Array<{
        id: string
        name: string
        status: "pending" | "running" | "completed" | "failed"
        result?: any
    }>
    currentTask: string | null
    progress: number
}

// Create test-only EASdk service (reusing from service tests)
class TestEASdk extends Effect.Service<TestEASdk>()("TestEASdk", {
    effect: Effect.succeed({
        createEnhancedLangGraphAgent: () => Effect.succeed({
            agentRuntime: {
                id: "test-agent-123" as any,
                send: () => Effect.succeed(undefined),
                getState: () => Effect.succeed({} as any),
                subscribe: () => ({} as any)
            },
            agentRuntimeId: "test-agent-123" as any
        }),
        validateAgentState: <TState extends LangGraphAgentState>(state: TState) => {
            const errors: string[] = []
            const warnings: string[] = []

            if (!state.agentRuntime) {
                errors.push("Missing required property: agentRuntime")
            }

            return Effect.succeed({
                isValid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined
            })
        },
        createActivityPayload: (operation: string, data?: Record<string, unknown>, metadata?: Record<string, unknown>) => Effect.succeed({
            operation,
            data: data ?? {},
            metadata: {
                timestamp: new Date().toISOString(),
                source: "ea-sdk",
                version: "1.0.0",
                ...metadata
            }
        }),
        validateConfiguration: (config: any) => Effect.succeed({
            recursionLimit: 50,
            timeoutMs: 30000,
            enableStreaming: false,
            errorHandling: "propagate",
            retryAttempts: 3,
            ...config
        }),
        checkCompatibility: () => Effect.succeed(true),
        createErrorHandler: (agentId: string, operation: string) => Effect.succeed(() =>
            Effect.fail(new Error(`Operation '${operation}' failed for agent '${agentId}'`))
        )
    }),
    dependencies: []
}) { }

describe("EA SDK Integration Tests", () => {
    describe("Chat Agent Workflow", () => {
        it("should handle complete chat conversation workflow", async () => {
            const mockRuntime = createMockAgentRuntime()

            // Initial chat agent state
            const initialState: ChatAgentState = {
                agentRuntime: mockRuntime,
                context: { userId: "user123", sessionId: "session456" },
                messages: [],
                currentStep: "waiting",
                metadata: {
                    messageCount: 0,
                    lastActivity: Date.now()
                }
            }

            // Validate initial state structure
            validateStateStructure(initialState, [
                "agentRuntime",
                "context.userId",
                "context.sessionId",
                "messages",
                "currentStep"
            ])

            // Create state transformers for common operations
            const addMessage = createStateTransformer<ChatAgentState, { role: "user" | "assistant"; content: string }>(
                (message, state) => ({
                    ...state,
                    messages: [...state.messages, {
                        id: `msg-${Date.now()}`,
                        role: message.role,
                        content: message.content,
                        timestamp: Date.now()
                    }],
                    metadata: {
                        ...state.metadata,
                        messageCount: state.metadata.messageCount + 1,
                        lastActivity: Date.now()
                    }
                })
            )

            const updateStep = createStateTransformer<ChatAgentState, ChatAgentState["currentStep"]>(
                (step, state) => ({ ...state, currentStep: step })
            )

            // Simulate user message processing
            let currentState = addMessage({ role: "user", content: "Hello, how are you?" }, initialState)
            currentState = updateStep("processing", currentState)

            expect(currentState.messages).toHaveLength(1)
            if (currentState.messages[0]) {
                expect(currentState.messages[0].role).toBe("user")
            }
            expect(currentState.currentStep).toBe("processing")

            // Simulate AI response generation using Effect
            const responseText = await runEffect(
                mockRuntime,
                Effect.gen(function* () {
                    const providerClient = yield* getProviderClient(mockRuntime, "gpt-4")
                    const response = yield* providerClient.generateText({ messages: [{ role: "user", content: "Hello, how are you?" }] } as any, { modelId: "gpt-4" })
                    return response.data.text
                }) as Effect.Effect<any, unknown, never>,
                { operation: "generate_response", nodeId: "chat-processor" }
            )

            // Add AI response
            currentState = addMessage({ role: "assistant", content: responseText }, currentState)
            currentState = updateStep("completed", currentState)

            expect(currentState.messages).toHaveLength(2)
            if (currentState.messages[1]) {
                expect(currentState.messages[1].role).toBe("assistant")
                expect(currentState.messages[1].content).toBe("Response to: Hello, how are you?")
            }
            expect(currentState.currentStep).toBe("completed")
            expect(currentState.metadata.messageCount).toBe(2)
        })

        it("should handle error scenarios gracefully", async () => {
            const mockRuntime = createMockAgentRuntime()

            const initialState: ChatAgentState = {
                agentRuntime: mockRuntime,
                context: { userId: "user123", sessionId: "session456" },
                messages: [],
                currentStep: "waiting",
                metadata: { messageCount: 0, lastActivity: Date.now() }
            }

            // Create a node that will fail
            const failingNode = wrapLangGraphNode("failing-node",
                async (_state: ChatAgentState): Promise<ChatAgentState> => {
                    throw new Error("Simulated node failure")
                }
            )

            await expect(failingNode(initialState)).rejects.toThrow("Node 'failing-node' execution failed")
        })
    })

    describe("Workflow Agent Integration", () => {
        it("should handle multi-step workflow execution", async () => {
            const mockRuntime = createMockAgentRuntime()

            const initialState: WorkflowAgentState = {
                agentRuntime: mockRuntime,
                context: { workflowId: "wf123", userId: "user456" },
                tasks: [
                    { id: "task1", name: "Initialize", status: "pending" },
                    { id: "task2", name: "Process Data", status: "pending" },
                    { id: "task3", name: "Generate Report", status: "pending" }
                ],
                currentTask: null,
                progress: 0
            }

            // Create workflow processor node
            const processTask = wrapLangGraphNode("process-task",
                async (state: WorkflowAgentState): Promise<WorkflowAgentState> => {
                    const nextTask = state.tasks.find(task => task.status === "pending")
                    if (!nextTask) {
                        return { ...state, currentTask: null, progress: 100 }
                    }

                    // Update task status
                    const updatedTasks = state.tasks.map(task =>
                        task.id === nextTask.id
                            ? { ...task, status: "completed" as const, result: `Result for ${task.name}` }
                            : task
                    )

                    const completedCount = updatedTasks.filter(task => task.status === "completed").length
                    const progress = Math.round((completedCount / updatedTasks.length) * 100)

                    return {
                        ...state,
                        tasks: updatedTasks,
                        currentTask: nextTask.id,
                        progress
                    }
                }
            )

            // Process all tasks
            let currentState = initialState
            for (let i = 0; i < 3; i++) {
                currentState = await processTask(currentState)
            }

            expect(currentState.progress).toBe(100)
            expect(currentState.tasks.every(task => task.status === "completed")).toBe(true)
            expect(currentState.tasks.every(task => task.result)).toBe(true)
        })
    })

    describe("SDK Service Integration", () => {
        it("should work with complete SDK workflow", async () => {
            const program = Effect.gen(function* () {
                const sdk = yield* TestEASdk
                const mockRuntime = createMockAgentRuntime()

                // Validate configuration
                const config = yield* sdk.validateConfiguration({
                    recursionLimit: 25,
                    timeoutMs: 45000,
                    enableStreaming: true
                })

                expect(config.recursionLimit).toBe(25)
                expect(config.timeoutMs).toBe(45000)
                expect(config.enableStreaming).toBe(true)

                // Create activity payload
                const activity = yield* sdk.createActivityPayload("workflow_start",
                    { workflowId: "wf123" },
                    { priority: "high" }
                )

                expect(activity.operation).toBe("workflow_start")
                expect(activity.data.workflowId).toBe("wf123")
                expect((activity.metadata as any)?.priority).toBe("high")

                // Check compatibility
                const isCompatible = yield* sdk.checkCompatibility()

                expect(isCompatible).toBe(true)

                return { config, activity, isCompatible }
            })

            const result = await Effect.runPromise(
                program.pipe(
                    Effect.provide(TestEASdk.Default)
                )
            )

            expect(result.config).toBeDefined()
            expect(result.activity).toBeDefined()
            expect(result.isCompatible).toBe(true)
        })
    })

    describe("Helper Utilities Integration", () => {
        it("should demonstrate real-world helper usage patterns", async () => {
            const mockRuntime = createMockAgentRuntime()

            const agentState: ChatAgentState = {
                agentRuntime: mockRuntime,
                context: { userId: "user123", sessionId: "session456" },
                messages: [
                    { id: "msg1", role: "user", content: "Hello", timestamp: Date.now() }
                ],
                currentStep: "processing",
                metadata: { messageCount: 1, lastActivity: Date.now() }
            }

            // Test property access patterns
            const userId = getStateProperty(agentState, "context.userId", "anonymous")
            const messageCount = getStateProperty(agentState, "messages.length", 0)
            const lastMessage = getStateProperty(agentState, "messages.0.content", "")

            expect(userId).toBe("user123")
            expect(messageCount).toBe(1)
            expect(lastMessage).toBe("Hello")

            // Test property updates
            const updatedState = setStateProperty(agentState, "metadata.lastActivity", Date.now())
            expect(updatedState.metadata.lastActivity).toBeDefined()
            expect(updatedState).not.toBe(agentState) // Immutable update

            // Test activity creation
            const activity = createActivity("message_processed",
                { messageId: "msg1", userId: "user123" },
                { source: "chat-processor", timestamp: new Date().toISOString() }
            )

            expect(activity.operation).toBe("message_processed")
            if (activity.data) {
                expect(activity.data.messageId).toBe("msg1")
            }
            expect((activity.metadata as any)?.source).toBe("chat-processor")

            // Test Effect execution
            const modelResponse = await runEffect(
                mockRuntime,
                Effect.gen(function* () {
                    const providerClient = yield* getProviderClient(mockRuntime, "gpt-4")
                    const response = yield* providerClient.generateText({ messages: [{ role: "user", content: "Process this message" }] } as any, { modelId: "gpt-4" })
                    return response.data.text.toUpperCase() // Transform response
                }) as Effect.Effect<any, unknown, never>,
                { operation: "process_message", nodeId: "message-processor" }
            )

            expect(modelResponse).toBe("RESPONSE TO: PROCESS THIS MESSAGE")
        })
    })
}) 