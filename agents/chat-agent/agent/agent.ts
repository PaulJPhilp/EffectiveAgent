/**
 * Chat Agent implementation using current TypeScript LangGraph API and EA SDK
 * @file Main agent class with StateGraph definition and compilation using current patterns
 */

import type { AgentRuntimeServiceApi } from "@/agent-runtime/api.js"
import { createStateTransformer } from "@/ea-langgraph-sdk/helpers.js"
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages"
import { Annotation, END, START, StateGraph } from "@langchain/langgraph"
import type { ChatAgentContext, ConversationMetadata } from "./agent-state.js"
import type { ChatAgentConfig } from "./types.js"
import { DEFAULT_CHAT_CONFIG } from "./types.js"

// Define the state annotation following current LangGraph patterns
const ChatStateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (existing: BaseMessage[], update: BaseMessage | BaseMessage[]) => {
            const newMessages = Array.isArray(update) ? update : [update]
            return existing.concat(newMessages)
        },
        default: () => []
    }),
    context: Annotation<ChatAgentContext>(),
    currentStep: Annotation<"waiting" | "processing" | "responding" | "completed" | "error">(),
    conversationMetadata: Annotation<ConversationMetadata>(),
    error: Annotation<string | undefined>(),
    agentRuntime: Annotation<AgentRuntimeServiceApi>()
})

// Export the state type for use in nodes
export type ChatAgentState = typeof ChatStateAnnotation.State

/**
 * Chat Agent class demonstrating current TypeScript LangGraph patterns with EA SDK integration
 */
export class ChatAgent {
    private readonly compiledGraph: ReturnType<typeof this.createChatGraph>
    private readonly config: ChatAgentConfig
    private readonly agentRuntime: AgentRuntimeServiceApi

    constructor(
        agentRuntime: AgentRuntimeServiceApi,
        config: ChatAgentConfig
    ) {
        this.agentRuntime = agentRuntime
        this.config = config
        this.compiledGraph = this.createChatGraph()
    }

    /**
     * Initialize a new chat session using EA SDK helper
     */
    async createInitialState(userId: string, sessionId: string): Promise<ChatAgentState> {
        const agentRuntime = this.agentRuntime
        const config = this.config

        // Create initial state matching current TypeScript LangGraph patterns
        const initialState: ChatAgentState = {
            messages: [],
            context: {
                userId,
                sessionId,
                preferences: {
                    language: "en",
                    tone: config.defaultTone
                }
            },
            currentStep: "waiting",
            conversationMetadata: {
                messageCount: 0,
                lastActivity: Date.now(),
                conversationStarted: Date.now(),
                topics: []
            },
            error: undefined,
            agentRuntime
        }

        return initialState
    }

    /**
     * Create the LangGraph StateGraph using current TypeScript API patterns
     */
    private createChatGraph() {
        // Import nodes - these must be regular async functions, not wrapped
        const { validateConversation, processUserMessage, generateResponse } = require("./nodes/index.js")

        // Create graph using current TypeScript StateGraph constructor with concrete state
        const graphBuilder = new StateGraph(ChatStateAnnotation)

        // Add nodes using current API - nodes must match annotation signature
        graphBuilder.addNode("validate", validateConversation)
        graphBuilder.addNode("process", processUserMessage)
        graphBuilder.addNode("respond", generateResponse)

        // Set entry point using START constant
        // @ts-expect-error - LangGraph TypeScript definitions don't properly support custom node names
        graphBuilder.addEdge(START, "validate")

        // Add conditional edges using current patterns
        graphBuilder.addConditionalEdges(
            // @ts-expect-error - LangGraph TypeScript definitions don't properly support custom node names
            "validate",
            (state: typeof ChatStateAnnotation.State) => {
                return state.error ? END : "process"
            }
        )

        graphBuilder.addConditionalEdges(
            // @ts-expect-error - LangGraph TypeScript definitions don't properly support custom node names
            "process",
            (state: typeof ChatStateAnnotation.State) => {
                return state.error ? END : "respond"
            }
        )

        // Connect respond node to END
        // @ts-expect-error - LangGraph TypeScript definitions don't properly support custom node names
        graphBuilder.addEdge("respond", END)

        return graphBuilder.compile()
    }

    /**
     * State transformer to add a message using current message pattern
     */
    readonly addMessage = createStateTransformer<ChatAgentState, {
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

    /**
     * Get conversation summary
     */
    async getSummary(state: ChatAgentState): Promise<string> {
        const messageCount = state.conversationMetadata.messageCount
        const topics = state.conversationMetadata.topics
        const duration = Date.now() - state.conversationMetadata.conversationStarted

        return `Conversation Summary:
- Messages: ${messageCount}
- Duration: ${Math.round(duration / 1000)}s
- Topics: ${topics.join(", ") || "General conversation"}
- Status: ${state.currentStep}
${state.error ? `- Error: ${state.error}` : ""}`
    }

    /**
     * Get the compiled graph for external use
     */
    getCompiledGraph() {
        return this.compiledGraph
    }
}

/**
 * Factory function to create a configured chat agent
 */
export function createChatAgent(
    agentRuntime: AgentRuntimeServiceApi,
    config: Partial<ChatAgentConfig> = {}
): ChatAgent {
    const mergedConfig = { ...DEFAULT_CHAT_CONFIG, ...config }
    return new ChatAgent(agentRuntime, mergedConfig)
} 