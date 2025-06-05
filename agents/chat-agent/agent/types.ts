/**
 * Types and configuration for the Chat Agent
 * @file Defines configuration interfaces and helper types
 */

/**
 * Configuration options for the chat agent
 */
export interface ChatAgentConfig {
    readonly maxMessages: number
    readonly responseTimeoutMs: number
    readonly enableTopicTracking: boolean
    readonly defaultTone: "formal" | "casual" | "friendly"
}

/**
 * Default configuration values
 */
export const DEFAULT_CHAT_CONFIG: ChatAgentConfig = {
    maxMessages: 50,
    responseTimeoutMs: 300000, // 5 minutes
    enableTopicTracking: true,
    defaultTone: "friendly"
}

/**
 * Message role type for type safety
 */
export type MessageRole = "user" | "assistant" | "system"

/**
 * Chat agent step type for state management
 */
export type ChatAgentStep = "waiting" | "processing" | "responding" | "completed" | "error" 