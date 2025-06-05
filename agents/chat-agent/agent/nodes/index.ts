/**
 * LangGraph node implementations for the Chat Agent
 * @file Defines the core nodes for chat conversation processing
 */

import {
    createActivity,
    createStateTransformer,
    getStateProperty,
    setStateProperty,
    validateStateStructure
} from "@/ea-langgraph-sdk/helpers.js"
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages"
import type { ChatAgentState } from "../agent.js"
import { generateAiResponse, logActivity, validateUserPolicies } from "../utils/index.js"

/**
 * State transformers for common operations
 */
const addMessage = createStateTransformer<ChatAgentState, {
    role: "user" | "assistant" | "system"
    content: string
    metadata?: Record<string, unknown>
}>((message, state) => {
    let newMessage: BaseMessage

    switch (message.role) {
        case "user":
            newMessage = new HumanMessage(message.content)
            break
        case "assistant":
            newMessage = new AIMessage(message.content)
            break
        case "system":
            newMessage = new AIMessage(message.content) // System messages as AI for simplicity
            break
        default:
            newMessage = new HumanMessage(message.content)
    }

    // Simple array concatenation for TypeScript version
    const updatedMessages = [...state.messages, newMessage]

    return {
        ...state,
        messages: updatedMessages,
        conversationMetadata: {
            ...state.conversationMetadata,
            messageCount: state.conversationMetadata.messageCount + 1,
            lastActivity: Date.now()
        }
    }
})

const updateStep = createStateTransformer<ChatAgentState, ChatAgentState["currentStep"]>(
    (step, state) => ({ ...state, currentStep: step })
)

const setError = createStateTransformer<ChatAgentState, string>(
    (error, state) => ({ ...state, error, currentStep: "error" })
)

/**
 * Extract topics from message content (simple keyword extraction)
 */
function extractTopics(message: string): string[] {
    const keywords = ["help", "question", "problem", "issue", "support", "information"]
    const words = message.toLowerCase().split(/\s+/)
    return keywords.filter(keyword => words.includes(keyword))
}

/**
 * Process incoming user message
 * Node function that conforms to LangGraph annotation pattern
 */
export async function processUserMessage(state: ChatAgentState): Promise<Partial<ChatAgentState>> {
    // Validate state structure
    validateStateStructure(state, [
        "agentRuntime",
        "context.userId",
        "context.sessionId",
        "messages",
        "conversationMetadata"
    ], { nodeId: "process-user-message" })

    // Get the last message (should be from user)
    const messages = getStateProperty(state, "messages", []) as BaseMessage[]
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage._getType() !== "human") {
        throw new Error("No user message to process")
    }

    // Update state to processing
    let currentState = updateStep("processing", state)

    // Create activity for message processing
    const activity = createActivity("message_received", {
        messageId: lastMessage.id,
        userId: getStateProperty(state, "context.userId", "unknown"),
        sessionId: getStateProperty(state, "context.sessionId", "unknown"),
        messageLength: typeof lastMessage.content === "string" ? lastMessage.content.length : 0
    }, {
        source: "chat-agent",
        nodeId: "process-user-message"
    })

    // Log activity through agent runtime
    await logActivity(
        state.agentRuntime,
        "message_received",
        activity.data || {},
        { ...activity.metadata, nodeId: "process-user-message" }
    )

    // Extract topics (simple keyword extraction)
    const messageContent = typeof lastMessage.content === "string" ? lastMessage.content : ""
    const topics = extractTopics(messageContent)
    if (topics.length > 0) {
        const existingTopics = getStateProperty(currentState, "conversationMetadata.topics", [])
        const newTopics = [...new Set([...existingTopics, ...topics])]
        currentState = setStateProperty(currentState, "conversationMetadata.topics", newTopics)
    }

    // Return only the changed fields as per LangGraph pattern
    return {
        currentStep: currentState.currentStep,
        conversationMetadata: currentState.conversationMetadata
    }
}

/**
 * Generate AI response using EA model service
 * Node function that conforms to LangGraph annotation pattern
 */
export async function generateResponse(state: ChatAgentState): Promise<Partial<ChatAgentState>> {
    try {
        // Get conversation context
        const recentMessages = getStateProperty(state, "messages", []).slice(-5) // Last 5 messages
        const userPreferences = getStateProperty(state, "context.preferences", {})

        // Build prompt with context
        const conversationHistory = recentMessages
            .map((msg: BaseMessage) => `${msg._getType()}: ${msg.content}`)
            .join("\n")

        const prompt = `
                You are a helpful assistant. Respond in a ${(userPreferences as any).tone || "friendly"} tone.

                Conversation history:
                ${conversationHistory}

                Please provide a helpful response to the user's latest message.
                `.trim()

        // Generate response using EA model service
        const response = await generateAiResponse(state.agentRuntime, prompt)

        // Create AI message
        const aiMessage = new AIMessage(response)

        // Create response activity
        const activity = createActivity("response_generated", {
            responseLength: response.length,
            messageCount: getStateProperty(state, "conversationMetadata.messageCount", 0),
            sessionId: getStateProperty(state, "context.sessionId", "unknown")
        }, {
            source: "chat-agent",
            nodeId: "generate-response"
        })

        // Log response activity
        await logActivity(
            state.agentRuntime,
            "response_generated",
            activity.data || {},
            { ...activity.metadata, nodeId: "generate-response" }
        )

        // Return partial state update following LangGraph pattern
        return {
            messages: [aiMessage], // This will be appended by the reducer
            currentStep: "completed",
            conversationMetadata: {
                ...state.conversationMetadata,
                messageCount: state.conversationMetadata.messageCount + 1,
                lastActivity: Date.now()
            }
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
        return {
            error: errorMessage,
            currentStep: "error"
        }
    }
}

/**
 * Validate conversation limits and policies
 * Node function that conforms to LangGraph annotation pattern
 */
export async function validateConversation(state: ChatAgentState): Promise<Partial<ChatAgentState>> {
    const messageCount = getStateProperty(state, "conversationMetadata.messageCount", 0)
    const lastActivity = getStateProperty(state, "conversationMetadata.lastActivity", 0)
    const currentTime = Date.now()

    // Check message limit (using a default of 50 if not configured)
    const maxMessages = 50 // This would come from config in real implementation
    if (messageCount >= maxMessages) {
        return {
            error: `Message limit reached (${maxMessages})`,
            currentStep: "error"
        }
    }

    // Check for timeout (using a default of 5 minutes if not configured)
    const timeoutMs = 300000 // 5 minutes
    if (currentTime - lastActivity > timeoutMs) {
        return {
            error: "Conversation timeout",
            currentStep: "error"
        }
    }

    // Use EA policy service for additional validation
    try {
        const userId = getStateProperty(state, "context.userId", "")
        const sessionId = getStateProperty(state, "context.sessionId", "")

        const policyResult = await validateUserPolicies(
            state.agentRuntime,
            userId,
            sessionId,
            messageCount
        )

        if (!policyResult.allowed) {
            return {
                error: `Policy validation failed: ${policyResult.reason}`,
                currentStep: "error"
            }
        }

        // Return empty object if validation passes (no state changes needed)
        return {}
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Policy validation failed"
        return {
            error: errorMessage,
            currentStep: "error"
        }
    }
} 