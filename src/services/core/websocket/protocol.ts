import { AgentActivity, AgentRuntimeId } from "@/agent-runtime/types.js"


/**
 * Valid message types for incoming messages
 */
export type IncomingMessageType = "send" | "subscribe" | "unsubscribe"

/**
 * Base interface for all messages sent from client to server
 */
export interface BaseIncomingMessage {
    readonly type: string
}

/**
 * Base interface for all messages sent from server to client
 */
export interface BaseOutgoingMessage {
    readonly type: string
}

/**
 * Interface for error messages sent from server to client
 */
export interface ErrorMessage extends BaseOutgoingMessage {
    readonly type: "error"
    readonly code: ProtocolErrorCode
    readonly message: string
    readonly details?: string
}

/**
 * Interface for send messages from client to server
 */
export interface SendMessage extends BaseIncomingMessage {
    readonly type: "send"
    readonly targetAgentRuntimeId: AgentRuntimeId
    readonly payload: AgentActivity
}

/**
 * Interface for subscribe messages from client to server
 */
export interface SubscribeMessage extends BaseIncomingMessage {
    readonly type: "subscribe"
    readonly agentRuntimeId: AgentRuntimeId
}

/**
 * Interface for unsubscribe messages from client to server
 */
export interface UnsubscribeMessage extends BaseIncomingMessage {
    readonly type: "unsubscribe"
    readonly agentRuntimeId: AgentRuntimeId
}

/**
 * Interface for activity messages sent from server to client
 */
export interface ActivityMessage extends BaseOutgoingMessage {
    readonly type: "activity"
    readonly agentRuntimeId: AgentRuntimeId
    readonly activity: AgentActivity
}

/**
 * Union type for all incoming messages
 */
export type IncomingMessage = SendMessage | SubscribeMessage | UnsubscribeMessage

/**
 * Union type for all outgoing messages
 */
export type OutgoingMessage = ActivityMessage | ErrorMessage

/**
 * Type guard for incoming messages
 */
export function isIncomingMessage(message: unknown): message is IncomingMessage {
    if (typeof message !== "object" || message === null) return false
    const msg = message as { type?: string }
    return msg.type === "send" || msg.type === "subscribe" || msg.type === "unsubscribe"
}

/**
 * Type guard for send messages
 */
export function isSendMessage(message: IncomingMessage): message is SendMessage {
    return message.type === "send"
}

/**
 * Type guard for subscribe messages
 */
export function isSubscribeMessage(message: IncomingMessage): message is SubscribeMessage {
    return message.type === "subscribe"
}

/**
 * Type guard for unsubscribe messages
 */
export function isUnsubscribeMessage(message: IncomingMessage): message is UnsubscribeMessage {
    return message.type === "unsubscribe"
}

/**
 * Type guard for error messages
 */
export function isErrorMessage(message: OutgoingMessage): message is ErrorMessage {
    return message.type === "error"
}

/**
 * Type guard for activity messages
 */
export function isActivityMessage(message: OutgoingMessage): message is ActivityMessage {
    return message.type === "activity"
}

/**
 * Protocol-specific error codes
 */
export const ProtocolErrorCodes = {
    UNKNOWN_ERROR: "UNKNOWN_ERROR",
    PARSE_ERROR: "PARSE_ERROR",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    AGENT_RUNTIME_SEND_FAILED: "AGENT_RUNTIME_SEND_FAILED",
    AGENT_RUNTIME_SUBSCRIBE_FAILED: "AGENT_RUNTIME_SUBSCRIBE_FAILED",
    SERIALIZATION_ERROR: "SERIALIZATION_ERROR",
    UNAUTHORIZED: "UNAUTHORIZED",
    UNKNOWN_MESSAGE_TYPE: "UNKNOWN_MESSAGE_TYPE",
    INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
} as const

export type ProtocolErrorCode = typeof ProtocolErrorCodes[keyof typeof ProtocolErrorCodes]

export type { AgentActivity, AgentRuntimeId } from "@/agent-runtime/types.js"
