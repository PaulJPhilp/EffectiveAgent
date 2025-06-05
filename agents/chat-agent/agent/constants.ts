/**
 * Constants for the Chat Agent
 * @file Defines constants used throughout the agent
 */

/**
 * Default timeout values
 */
export const TIMEOUTS = {
    RESPONSE_TIMEOUT_MS: 300000, // 5 minutes
    MESSAGE_PROCESSING_TIMEOUT_MS: 30000, // 30 seconds
    VALIDATION_TIMEOUT_MS: 10000 // 10 seconds
} as const

/**
 * Message limits
 */
export const LIMITS = {
    MAX_MESSAGES: 50,
    MAX_MESSAGE_LENGTH: 4000,
    MAX_CONVERSATION_DURATION_MS: 3600000 // 1 hour
} as const

/**
 * Topic extraction keywords
 */
export const TOPIC_KEYWORDS = [
    "help",
    "question",
    "problem",
    "issue",
    "support",
    "information",
    "account",
    "billing",
    "technical",
    "feature"
] as const

/**
 * Agent metadata
 */
export const AGENT_INFO = {
    NAME: "chat-agent",
    VERSION: "1.0.0",
    DESCRIPTION: "Chat agent built with Effective Agent and LangGraph"
} as const 