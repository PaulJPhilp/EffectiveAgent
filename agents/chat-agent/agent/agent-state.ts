/**
 * Agent state interface for the Chat Agent
 * @file Defines the typed state structure for chat conversations following current TypeScript LangGraph patterns
 */

import type { BaseMessage } from "@langchain/core/messages"
import type { AgentRuntimeServiceApi } from "@/ea-agent-runtime/api.js"

/**
 * Context properties specific to chat conversations
 */
export interface ChatAgentContext extends Record<string, unknown> {
    readonly userId: string
    readonly sessionId: string
    readonly preferences?: {
        readonly language: string
        readonly tone: "formal" | "casual" | "friendly"
    }
}

/**
 * Conversation metadata for tracking
 */
export interface ConversationMetadata {
    readonly messageCount: number
    readonly lastActivity: number
    readonly conversationStarted: number
    readonly topics: string[]
}

/**
 * TypeScript LangGraph State interface following current patterns
 * This follows the TypeScript LangGraph API, not Python patterns
 */
export interface ChatAgentState {
    // Messages using standard BaseMessage[] with default handling
    messages: BaseMessage[]
    context: ChatAgentContext
    currentStep: "waiting" | "processing" | "responding" | "completed" | "error"
    conversationMetadata: ConversationMetadata
    error?: string
    agentRuntime: AgentRuntimeServiceApi
}

/**
 * Generic state interface for use with LangGraph 
 * Parameterized to allow for different context types
 */
export interface LangGraphAgentState<TContext = ChatAgentContext> {
    readonly messages: BaseMessage[]
    readonly context: TContext
    readonly agentRuntime: AgentRuntimeServiceApi
} 