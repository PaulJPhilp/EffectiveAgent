/**
 * Sample Chat Agent implementation using EA SDK
 * @file Demonstrates practical LangGraph agent with EA integration
 * 
 * This example shows how to:
 * - Define typed agent state
 * - Use EA SDK helpers for state management
 * - Integrate with EA services through runEffect
 * - Handle errors gracefully with wrappers
 * - Create standardized activity payloads
 */

import { Effect } from "effect"
import type { AgentRuntimeServiceApi } from "../api.js"
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

// Define the chat agent state interface
interface ChatAgentState extends LangGraphAgentState<{
    userId: string
    sessionId: string
    preferences?: {
        language: string
        tone: "formal" | "casual" | "friendly"
    }
}> {
    messages: Array<{
        id: string
        role: "user" | "assistant" | "system"
        content: string
        timestamp: number
        metadata?: Record<string, unknown>
    }>
    currentStep: "waiting" | "processing" | "responding" | "completed" | "error"
    conversationMetadata: {
        messageCount: number
        lastActivity: number
        conversationStarted: number
        topics: string[]
    }
    error?: string
}

// Configuration for the chat agent
interface ChatAgentConfig {
    maxMessages: number
    responseTimeoutMs: number
    enableTopicTracking: boolean
    defaultTone: "formal" | "casual" | "friendly"
}

/**
 * Chat Agent class demonstrating EA SDK integration patterns
 */
export class ChatAgent {
    constructor(
        private readonly agentRuntime: AgentRuntimeServiceApi,
        private readonly config: ChatAgentConfig
    ) { }

    /**
     * Initialize a new chat session
     */
    createInitialState(userId: string, sessionId: string): ChatAgentState {
        return {
            agentRuntime: this.agentRuntime,
            context: {
                userId,
                sessionId,
                preferences: {
                    language: "en",
                    tone: this.config.defaultTone
                }
            },
            messages: [],
            currentStep: "waiting",
            conversationMetadata: {
                messageCount: 0,
                lastActivity: Date.now(),
                conversationStarted: Date.now(),
                topics: []
            }
        }
    }

    /**
     * State transformers for common operations
     */
    private readonly addMessage = createStateTransformer<ChatAgentState, {
        role: "user" | "assistant" | "system"
        content: string
        metadata?: Record<string, unknown>
    }>((message, state) => {
        const newMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            role: message.role,
            content: message.content,
            timestamp: Date.now(),
            metadata: message.metadata
        }

        return {
            ...state,
            messages: [...state.messages, newMessage],
            conversationMetadata: {
                ...state.conversationMetadata,
                messageCount: state.conversationMetadata.messageCount + 1,
                lastActivity: Date.now()
            }
        }
    })

    private readonly updateStep = createStateTransformer<ChatAgentState, ChatAgentState["currentStep"]>(
        (step, state) => ({ ...state, currentStep: step })
    )

    private readonly setError = createStateTransformer<ChatAgentState, string>(
        (error, state) => ({ ...state, error, currentStep: "error" })
    )

    /**
     * Process incoming user message
     */
    readonly processUserMessage = wrapLangGraphNode("process-user-message",
        async (state: ChatAgentState): Promise<ChatAgentState> => {
            // Validate state structure
            validateStateStructure(state, [
                "agentRuntime",
                "context.userId",
                "context.sessionId",
                "messages",
                "conversationMetadata"
            ], { nodeId: "process-user-message" })

            // Get the last message (should be from user)
            const messages = getStateProperty(state, "messages", []) as any[]
            const lastMessage = messages[messages.length - 1]
            if (!lastMessage || lastMessage.role !== "user") {
                throw new Error("No user message to process")
            }

            // Update state to processing
            let currentState = this.updateStep("processing", state)

            // Create activity for message processing
            const activity = createActivity("message_received", {
                messageId: lastMessage.id,
                userId: getStateProperty(state, "context.userId", "unknown"),
                sessionId: getStateProperty(state, "context.sessionId", "unknown"),
                messageLength: lastMessage.content.length
            }, {
                source: "chat-agent",
                nodeId: "process-user-message"
            })

            // Log activity through agent runtime
            await runEffect(
                state.agentRuntime,
                Effect.logInfo("User message received", activity),
                { operation: "log_activity", nodeId: "process-user-message" }
            )

            // Extract topics (simple keyword extraction)
            const topics = this.extractTopics(lastMessage.content)
            if (topics.length > 0) {
                const existingTopics = getStateProperty(currentState, "conversationMetadata.topics", [])
                const newTopics = [...new Set([...existingTopics, ...topics])]
                currentState = setStateProperty(currentState, "conversationMetadata.topics", newTopics)
            }

            return currentState
        }
    )

    /**
     * Generate AI response using EA model service
     */
    readonly generateResponse = wrapLangGraphNode("generate-response",
        async (state: ChatAgentState): Promise<ChatAgentState> => {
            let currentState = this.updateStep("responding", state)

            try {
                // Get conversation context
                const recentMessages = getStateProperty(state, "messages", []).slice(-5) // Last 5 messages
                const userPreferences = getStateProperty(state, "context.preferences", {})

                // Generate response using EA model service
                const response = await runEffect(
                    state.agentRuntime,
                    Effect.gen(function* () {
                        const modelService = yield* state.agentRuntime.getModelService()
                        const providerName = yield* modelService.getProviderName("gpt-4")
                        const providerService = yield* state.agentRuntime.getProviderService()
                        const providerClient = yield* providerService.getProviderClient(providerName)

                        // Build prompt with context
                        const conversationHistory = recentMessages
                            .map((msg: any) => `${msg.role}: ${msg.content}`)
                            .join("\n")

                        const prompt = `
                            You are a helpful assistant. Respond in a ${(userPreferences as any).tone || "friendly"} tone.

                            Conversation history:
                            ${conversationHistory}

                            Please provide a helpful response to the user's latest message.
                            `.trim()

                        const response = yield* providerClient.generateText({ messages: [{ role: "user", content: prompt }] } as any, { modelId: "gpt-4" })
                        return response.data.text
                    }) as Effect.Effect<any, unknown, never>,
                    {
                        operation: "generate_ai_response",
                        nodeId: "generate-response",
                        agentId: getStateProperty(state, "agentRuntime.id", "unknown")
                    }
                )

                // Add AI response to conversation
                currentState = this.addMessage({
                    role: "assistant",
                    content: response,
                    metadata: {
                        generationTime: Date.now(),
                        model: "ea-default",
                        promptTokens: Math.floor(recentMessages.join(" ").length / 4), // Rough estimate
                        completionTokens: Math.floor(response.length / 4)
                    }
                }, currentState)

                // Create response activity
                const activity = createActivity("response_generated", {
                    responseLength: response.length,
                    messageCount: getStateProperty(currentState, "conversationMetadata.messageCount", 0),
                    sessionId: getStateProperty(state, "context.sessionId", "unknown")
                }, {
                    source: "chat-agent",
                    nodeId: "generate-response"
                })

                // Log response activity
                await runEffect(
                    state.agentRuntime,
                    Effect.logInfo("AI response generated", activity),
                    { operation: "log_response", nodeId: "generate-response" }
                )

                return this.updateStep("completed", currentState)

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
                return this.setError(errorMessage, currentState)
            }
        }
    )

    /**
     * Validate conversation limits and policies
     */
    readonly validateConversation = wrapLangGraphNode("validate-conversation",
        async (state: ChatAgentState): Promise<ChatAgentState> => {
            const messageCount = getStateProperty(state, "conversationMetadata.messageCount", 0)
            const lastActivity = getStateProperty(state, "conversationMetadata.lastActivity", 0)
            const currentTime = Date.now()

            // Check message limit
            if (messageCount >= this.config.maxMessages) {
                return this.setError(`Message limit reached (${this.config.maxMessages})`, state)
            }

            // Check for timeout
            if (currentTime - lastActivity > this.config.responseTimeoutMs) {
                return this.setError("Conversation timeout", state)
            }

            // Use EA policy service for additional validation
            try {
                await runEffect(
                    state.agentRuntime,
                    Effect.gen(function* () {
                        const policyService = yield* state.agentRuntime.getPolicyService()
                        const userId = getStateProperty(state, "context.userId", "")

                        // Check user policies (rate limiting, content filtering, etc.)
                        return yield* (policyService as any).validateUserAction(userId, "chat_message", {
                            messageCount,
                            sessionId: getStateProperty(state, "context.sessionId", "")
                        })
                    }) as Effect.Effect<any, unknown, never>,
                    {
                        operation: "validate_policies",
                        nodeId: "validate-conversation",
                        agentId: getStateProperty(state, "agentRuntime.id", "unknown")
                    }
                )

                return state
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Policy validation failed"
                return this.setError(errorMessage, state)
            }
        }
    )

    /**
     * Simple topic extraction (in real implementation, this might use NLP services)
     */
    private extractTopics(message: string): string[] {
        const keywords = ["help", "question", "problem", "issue", "support", "information"]
        const words = message.toLowerCase().split(/\s+/)
        return keywords.filter(keyword => words.includes(keyword))
    }

    /**
     * Get conversation summary
     */
    async getSummary(state: ChatAgentState): Promise<string> {
        const messageCount = getStateProperty(state, "conversationMetadata.messageCount", 0)
        const topics = getStateProperty(state, "conversationMetadata.topics", [])
        const duration = Date.now() - getStateProperty(state, "conversationMetadata.conversationStarted", 0)

        return `Conversation Summary:
- Messages: ${messageCount}
- Duration: ${Math.round(duration / 1000)}s
- Topics: ${topics.join(", ") || "General conversation"}
- Status: ${state.currentStep}
${state.error ? `- Error: ${state.error}` : ""}`
    }
}

/**
 * Factory function to create a configured chat agent
 */
export function createChatAgent(
    agentRuntime: AgentRuntimeServiceApi,
    config: Partial<ChatAgentConfig> = {}
): ChatAgent {
    const defaultConfig: ChatAgentConfig = {
        maxMessages: 50,
        responseTimeoutMs: 300000, // 5 minutes
        enableTopicTracking: true,
        defaultTone: "friendly"
    }

    return new ChatAgent(agentRuntime, { ...defaultConfig, ...config })
}

/**
 * Example usage function showing how to use the chat agent
 */
export async function exampleChatAgentUsage(agentRuntime: AgentRuntimeServiceApi): Promise<void> {
    // Create agent instance
    const chatAgent = createChatAgent(agentRuntime, {
        maxMessages: 10,
        defaultTone: "casual"
    })

    // Initialize conversation
    let state = chatAgent.createInitialState("user123", "session456")

    // Add user message
    const addMessage = createStateTransformer<ChatAgentState, {
        role: "user" | "assistant" | "system"
        content: string
    }>((message, state) => ({
        ...state,
        messages: [...state.messages, {
            id: `msg-${Date.now()}`,
            role: message.role,
            content: message.content,
            timestamp: Date.now()
        }]
    }))

    state = addMessage({ role: "user", content: "Hello, I need help with my account" }, state)

    // Process the conversation
    state = await chatAgent.validateConversation(state)
    state = await chatAgent.processUserMessage(state)
    state = await chatAgent.generateResponse(state)

    // Get summary
    const summary = await chatAgent.getSummary(state)
    console.log(summary)
} 