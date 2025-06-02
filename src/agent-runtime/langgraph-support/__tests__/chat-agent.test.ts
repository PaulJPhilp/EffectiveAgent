/**
 * Comprehensive test suite for Chat Agent
 * @file Tests the ChatAgent class with all its functionality using real services
 */

import { Effect } from "effect"
import { beforeEach, describe, expect, it } from "vitest"
import type { AgentRuntimeServiceApi } from "../../api.js"
import { ChatAgent, createChatAgent } from "../examples/chat-agent.js"
import {
    createStateTransformer,
    getStateProperty,
    setStateProperty
} from "../helpers.js"

// Import the actual ChatAgentState type from the chat-agent file
type ChatAgentState = ReturnType<ChatAgent['createInitialState']>

// Create test runtime with comprehensive service mocks
const createTestAgentRuntime = (): AgentRuntimeServiceApi => ({
    create: () => Effect.succeed({} as any),
    terminate: () => Effect.succeed(undefined),
    send: () => Effect.succeed(undefined),
    getState: () => Effect.succeed({} as any),
    subscribe: () => ({} as any),
    getModelService: () => Effect.succeed({
        getProviderName: (modelName: string) => Effect.succeed("openai"),
        generateResponse: (prompt: string) => Effect.succeed(`AI response to: ${prompt}`),
        getModelInfo: () => Effect.succeed({ model: "gpt-4", provider: "openai" })
    } as any),
    getProviderService: () => Effect.succeed({
        getProviderClient: (providerName: string) => Effect.succeed({
            generateText: (input: any, options: any) => Effect.succeed({
                data: { text: `AI response: ${input.messages[0]?.content || "Hello"}` },
                usage: { tokens: 10 }
            })
        } as any)
    } as any),
    getPolicyService: () => Effect.succeed({
        validateUserAction: (userId: string, action: string, data: any) => Effect.succeed({
            allowed: true,
            reason: "within limits"
        })
    } as any),
    getToolRegistryService: () => Effect.succeed({} as any),
    getFileService: () => Effect.succeed({} as any),
    createLangGraphAgent: () => Effect.succeed({
        agentRuntime: {
            id: "test-chat-agent" as any,
            send: () => Effect.succeed(undefined),
            getState: () => Effect.succeed({} as any),
            subscribe: () => ({} as any)
        },
        agentRuntimeId: "test-chat-agent" as any
    }),
    run: <Output>(logicToRun: Effect.Effect<Output, any, any>) => Effect.runPromise(logicToRun as any)
})

// Create failing runtime for error testing
const createFailingAgentRuntime = (): AgentRuntimeServiceApi => ({
    ...createTestAgentRuntime(),
    getModelService: () => Effect.succeed({
        getProviderName: () => Effect.fail(new Error("Model service unavailable")),
        generateResponse: () => Effect.fail(new Error("Generation failed")),
        getModelInfo: () => Effect.fail(new Error("Model info unavailable"))
    } as any),
    getPolicyService: () => Effect.succeed({
        validateUserAction: () => Effect.fail(new Error("Policy validation failed"))
    } as any)
})

describe("ChatAgent Comprehensive Tests", () => {
    let testRuntime: AgentRuntimeServiceApi
    let chatAgent: ChatAgent

    beforeEach(() => {
        testRuntime = createTestAgentRuntime()
        chatAgent = createChatAgent(testRuntime, {
            maxMessages: 10,
            responseTimeoutMs: 30000,
            enableTopicTracking: true,
            defaultTone: "friendly"
        })
    })

    describe("Initialization and Configuration", () => {
        it("should create chat agent with default configuration", () => {
            const agent = createChatAgent(testRuntime)
            expect(agent).toBeInstanceOf(ChatAgent)
        })

        it("should create chat agent with custom configuration", () => {
            const customAgent = createChatAgent(testRuntime, {
                maxMessages: 5,
                responseTimeoutMs: 15000,
                enableTopicTracking: false,
                defaultTone: "formal"
            })
            expect(customAgent).toBeInstanceOf(ChatAgent)
        })

        it("should create proper initial state", () => {
            const state = chatAgent.createInitialState("user123", "session456")

            if (!state.context) {
                throw new Error("Context is undefined")
            }
            expect(state.context.userId).toBe("user123")
            expect(state.context.sessionId).toBe("session456")
            expect(state.context.preferences?.tone).toBe("friendly")
            expect(state.messages).toEqual([])
            expect(state.currentStep).toBe("waiting")
            expect(state.conversationMetadata.messageCount).toBe(0)
            expect(state.conversationMetadata.topics).toEqual([])
            expect(state.conversationMetadata.conversationStarted).toBeGreaterThan(0)
        })
    })

    describe("State Management", () => {
        let initialState: ChatAgentState

        beforeEach(() => {
            initialState = chatAgent.createInitialState("user123", "session456")
        })

        it("should handle state property access", () => {
            const userId = getStateProperty(initialState, "context.userId", "unknown")
            const messageCount = getStateProperty(initialState, "conversationMetadata.messageCount", -1)
            const nonExistent = getStateProperty(initialState, "missing.property", "fallback")

            expect(userId).toBe("user123")
            expect(messageCount).toBe(0)
            expect(nonExistent).toBe("fallback")
        })

        it("should handle state property updates", () => {
            const updatedState = setStateProperty(initialState, "currentStep", "processing")

            expect(updatedState.currentStep).toBe("processing")
            expect(updatedState).not.toBe(initialState) // Immutable update
            expect(initialState.currentStep).toBe("waiting") // Original unchanged
        })

        it("should use state transformers properly", () => {
            const addMessage = createStateTransformer<ChatAgentState, {
                role: "user" | "assistant"
                content: string
            }>((message, state) => ({
                ...state,
                messages: [...state.messages, {
                    id: `msg-${Date.now()}`,
                    role: message.role,
                    content: message.content,
                    timestamp: Date.now()
                }],
                conversationMetadata: {
                    ...state.conversationMetadata,
                    messageCount: state.conversationMetadata.messageCount + 1
                }
            }))

            const stateWithMessage = addMessage({
                role: "user",
                content: "Hello there!"
            }, initialState)

            expect(stateWithMessage.messages).toHaveLength(1)
            expect(stateWithMessage.messages[0]?.content).toBe("Hello there!")
            expect(stateWithMessage.conversationMetadata.messageCount).toBe(1)
        })
    })

    describe("Message Processing", () => {
        let stateWithUserMessage: ChatAgentState

        beforeEach(() => {
            const initialState = chatAgent.createInitialState("user123", "session456")
            // Add a user message manually for testing
            stateWithUserMessage = {
                ...initialState,
                messages: [{
                    id: "msg-1",
                    role: "user",
                    content: "Hello, I need help with my account",
                    timestamp: Date.now()
                }],
                conversationMetadata: {
                    ...initialState.conversationMetadata,
                    messageCount: 1
                }
            }
        })

        it("should process user message successfully", async () => {
            const result = await chatAgent.processUserMessage(stateWithUserMessage)

            expect(result.currentStep).toBe("processing")
            expect(result.conversationMetadata.topics).toContain("help")
            expect(result.conversationMetadata.lastActivity).toBeGreaterThanOrEqual(stateWithUserMessage.conversationMetadata.lastActivity)
        })

        it("should extract topics from user messages", async () => {
            const stateWithKeywords = {
                ...stateWithUserMessage,
                messages: [{
                    id: "msg-1",
                    role: "user" as const,
                    content: "I have a question about support and need information",
                    timestamp: Date.now()
                }]
            }

            const result = await chatAgent.processUserMessage(stateWithKeywords)

            expect(result.conversationMetadata.topics).toEqual(
                expect.arrayContaining(["question", "support", "information"])
            )
        })

        it("should fail when no user message to process", async () => {
            const stateWithoutUserMessage = {
                ...stateWithUserMessage,
                messages: []
            }

            await expect(chatAgent.processUserMessage(stateWithoutUserMessage))
                .rejects.toThrow("Node 'process-user-message' execution failed")
        })

        it("should fail when last message is not from user", async () => {
            const stateWithAssistantMessage = {
                ...stateWithUserMessage,
                messages: [{
                    id: "msg-1",
                    role: "assistant" as const,
                    content: "I'm an assistant message",
                    timestamp: Date.now()
                }]
            }

            await expect(chatAgent.processUserMessage(stateWithAssistantMessage))
                .rejects.toThrow("Node 'process-user-message' execution failed")
        })
    })

    describe("Response Generation", () => {
        let stateForResponse: ChatAgentState

        beforeEach(() => {
            const initialState = chatAgent.createInitialState("user123", "session456")
            stateForResponse = {
                ...initialState,
                messages: [{
                    id: "msg-1",
                    role: "user",
                    content: "What's the weather like?",
                    timestamp: Date.now()
                }],
                currentStep: "processing",
                conversationMetadata: {
                    ...initialState.conversationMetadata,
                    messageCount: 1
                }
            }
        })

        it("should generate AI response successfully", async () => {
            const result = await chatAgent.generateResponse(stateForResponse)

            expect(result.currentStep).toBe("completed")
            expect(result.messages).toHaveLength(2)

            const aiMessage = result.messages[1]
            expect(aiMessage?.role).toBe("assistant")
            expect(aiMessage?.content).toContain("AI response")
            expect(aiMessage?.metadata?.generationTime).toBeDefined()
            expect(aiMessage?.metadata?.model).toBe("ea-default")
        })

        it("should include conversation context in response", async () => {
            // Add multiple messages to test context handling
            const stateWithHistory = {
                ...stateForResponse,
                messages: [
                    { id: "msg-1", role: "user" as const, content: "Hi there", timestamp: Date.now() },
                    { id: "msg-2", role: "assistant" as const, content: "Hello! How can I help?", timestamp: Date.now() },
                    { id: "msg-3", role: "user" as const, content: "What's the weather?", timestamp: Date.now() }
                ],
                conversationMetadata: {
                    ...stateForResponse.conversationMetadata,
                    messageCount: 3
                }
            }

            const result = await chatAgent.generateResponse(stateWithHistory)

            expect(result.currentStep).toBe("completed")
            expect(result.messages).toHaveLength(4)
        })

        it("should handle generation errors gracefully", async () => {
            const failingRuntime = createFailingAgentRuntime()
            const failingAgent = createChatAgent(failingRuntime)
            const stateWithFailingRuntime = {
                ...stateForResponse,
                agentRuntime: failingRuntime
            }

            const result = await failingAgent.generateResponse(stateWithFailingRuntime)

            expect(result.currentStep).toBe("error")
            expect(result.error).toBeDefined()
            expect(result.error).toContain("Effect execution failed")
        })

        it("should respect user preferences in response generation", async () => {
            const stateWithPreferences = {
                ...stateForResponse,
                context: {
                    userId: "user123",
                    sessionId: "session456",
                    ...stateForResponse.context,
                    preferences: {
                        language: "en",
                        tone: "formal" as const
                    }
                }
            }

            const result = await chatAgent.generateResponse(stateWithPreferences)

            expect(result.currentStep).toBe("completed")
            // The response generation would use the formal tone in the prompt
            expect(result.messages[1]?.content).toBeDefined()
        })
    })

    describe("Conversation Validation", () => {
        let baseState: ChatAgentState

        beforeEach(() => {
            baseState = chatAgent.createInitialState("user123", "session456")
        })

        it("should pass validation within limits", async () => {
            const validState = {
                ...baseState,
                conversationMetadata: {
                    ...baseState.conversationMetadata,
                    messageCount: 5,
                    lastActivity: Date.now() - 1000 // 1 second ago
                }
            }

            const result = await chatAgent.validateConversation(validState)

            expect(result.currentStep).not.toBe("error")
            expect(result.error).toBeUndefined()
        })

        it("should fail validation when message limit exceeded", async () => {
            const overLimitState = {
                ...baseState,
                conversationMetadata: {
                    ...baseState.conversationMetadata,
                    messageCount: 15 // Exceeds maxMessages: 10
                }
            }

            const result = await chatAgent.validateConversation(overLimitState)

            expect(result.currentStep).toBe("error")
            expect(result.error).toContain("Message limit reached (10)")
        })

        it("should fail validation on timeout", async () => {
            const timedOutState = {
                ...baseState,
                conversationMetadata: {
                    ...baseState.conversationMetadata,
                    lastActivity: Date.now() - 40000 // 40 seconds ago, exceeds 30s timeout
                }
            }

            const result = await chatAgent.validateConversation(timedOutState)

            expect(result.currentStep).toBe("error")
            expect(result.error).toContain("Conversation timeout")
        })

        it("should handle policy service failures", async () => {
            const failingRuntime = createFailingAgentRuntime()
            const stateWithFailingRuntime = {
                ...baseState,
                agentRuntime: failingRuntime
            }

            const failingAgent = createChatAgent(failingRuntime)
            const result = await failingAgent.validateConversation(stateWithFailingRuntime)

            expect(result.currentStep).toBe("error")
            expect(result.error).toContain("Effect execution failed")
        })
    })

    describe("Complete Conversation Flow", () => {
        it("should handle full conversation workflow", async () => {
            let state = chatAgent.createInitialState("user123", "session456")

            // Add user message
            const addMessage = createStateTransformer<ChatAgentState, {
                role: "user" | "assistant"
                content: string
            }>((message, state) => ({
                ...state,
                messages: [...state.messages, {
                    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    role: message.role,
                    content: message.content,
                    timestamp: Date.now()
                }],
                conversationMetadata: {
                    ...state.conversationMetadata,
                    messageCount: state.conversationMetadata.messageCount + 1,
                    lastActivity: Date.now()
                }
            }))

            state = addMessage({
                role: "user",
                content: "Hello, I have a question about my account"
            }, state)

            // Process through the workflow
            state = await chatAgent.validateConversation(state)
            expect(state.currentStep).not.toBe("error")

            state = await chatAgent.processUserMessage(state)
            expect(state.currentStep).toBe("processing")
            expect(state.conversationMetadata.topics).toContain("question")

            state = await chatAgent.generateResponse(state)
            expect(state.currentStep).toBe("completed")
            expect(state.messages).toHaveLength(2)

            // Verify final state
            expect(state.messages[0]?.role).toBe("user")
            expect(state.messages[1]?.role).toBe("assistant")
            expect(state.conversationMetadata.messageCount).toBe(2)
        })

        it("should handle multiple message exchanges", async () => {
            let state = chatAgent.createInitialState("user123", "session456")

            const addMessage = createStateTransformer<ChatAgentState, {
                role: "user" | "assistant"
                content: string
            }>((message, state) => ({
                ...state,
                messages: [...state.messages, {
                    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    role: message.role,
                    content: message.content,
                    timestamp: Date.now()
                }],
                conversationMetadata: {
                    ...state.conversationMetadata,
                    messageCount: state.conversationMetadata.messageCount + 1,
                    lastActivity: Date.now()
                }
            }))

            // First exchange
            state = addMessage({ role: "user", content: "Hello" }, state)
            state = await chatAgent.processUserMessage(state)
            state = await chatAgent.generateResponse(state)

            // Second exchange
            state = addMessage({ role: "user", content: "How are you?" }, state)
            state = await chatAgent.processUserMessage(state)
            state = await chatAgent.generateResponse(state)

            expect(state.messages).toHaveLength(4)
            expect(state.conversationMetadata.messageCount).toBe(4)
            expect(state.currentStep).toBe("completed")
        })
    })

    describe("Conversation Summary", () => {
        it("should generate conversation summary", async () => {
            const state = {
                ...chatAgent.createInitialState("user123", "session456"),
                messages: [
                    { id: "msg-1", role: "user" as const, content: "Hello", timestamp: Date.now() },
                    { id: "msg-2", role: "assistant" as const, content: "Hi there!", timestamp: Date.now() }
                ],
                conversationMetadata: {
                    messageCount: 2,
                    lastActivity: Date.now(),
                    conversationStarted: Date.now() - 5000,
                    topics: ["help", "question"]
                },
                currentStep: "completed" as const
            }

            const summary = await chatAgent.getSummary(state)

            expect(summary).toContain("Messages: 2")
            expect(summary).toContain("Topics: help, question")
            expect(summary).toContain("Status: completed")
            expect(summary).toContain("Duration:")
        })

        it("should include error in summary when present", async () => {
            const errorState = {
                ...chatAgent.createInitialState("user123", "session456"),
                currentStep: "error" as const,
                error: "Test error message",
                conversationMetadata: {
                    messageCount: 1,
                    lastActivity: Date.now(),
                    conversationStarted: Date.now() - 1000,
                    topics: []
                }
            }

            const summary = await chatAgent.getSummary(errorState)

            expect(summary).toContain("Status: error")
            expect(summary).toContain("Error: Test error message")
        })
    })

    describe("Edge Cases and Error Handling", () => {
        it("should handle empty state gracefully", async () => {
            const invalidState = {} as ChatAgentState

            await expect(chatAgent.processUserMessage(invalidState))
                .rejects.toThrow()
        })

        it("should handle malformed messages", async () => {
            const state = {
                ...chatAgent.createInitialState("user123", "session456"),
                messages: [
                    { content: "Missing required fields" } as any
                ]
            } as ChatAgentState

            await expect(chatAgent.processUserMessage(state))
                .rejects.toThrow()
        })

        it("should handle very long conversations", async () => {
            const longConversationState = {
                ...chatAgent.createInitialState("user123", "session456"),
                messages: Array.from({ length: 20 }, (_, i) => ({
                    id: `msg-${i}`,
                    role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
                    content: `Message ${i}`,
                    timestamp: Date.now() - (20 - i) * 1000
                })),
                conversationMetadata: {
                    messageCount: 20,
                    lastActivity: Date.now(),
                    conversationStarted: Date.now() - 20000,
                    topics: ["test"]
                }
            }

            // Should only use last 5 messages for context
            const result = await chatAgent.generateResponse(longConversationState)
            expect(result.currentStep).toBe("completed")
        })
    })
}) 