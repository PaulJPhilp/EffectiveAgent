import { EffectiveError } from "../../../errors.js"

export type WebSocketErrorTag = "WebSocketError" | "WebSocketConnectionError" | "WebSocketSendError" | "WebSocketSerializationError"

/**
 * Base error class for WebSocket-related errors
 */
export class WebSocketError extends EffectiveError {


    constructor(options: { message: string, cause?: unknown, _tag: WebSocketErrorTag }) {
        super({
            description: options.message,
            module: "websocket",
            method: "websocket",
            cause: options.cause
        })
    }
}

/**
 * Error thrown when WebSocket connection fails
 */
export class WebSocketConnectionError extends WebSocketError {
    constructor(options: { url: string, message: string, cause?: unknown }) {
        super({
            message: `Failed to connect to WebSocket at ${options.url}: ${options.message}`,
            cause: options.cause,
            _tag: "WebSocketConnectionError"
        })
    }
}

/**
 * Error thrown when sending a message fails
 */
export class WebSocketSendError extends WebSocketError {
    constructor(options: { message: string, cause?: unknown }) {
        super({
            message: `Failed to send WebSocket message: ${options.message}`,
            cause: options.cause,
            _tag: "WebSocketSendError"
        })
    }
}

/**
 * Error thrown when message serialization/deserialization fails
 */
export class WebSocketSerializationError extends WebSocketError {
    constructor(options: { message: string, data: unknown, cause?: unknown }) {
        super({
            message: `WebSocket serialization error: ${options.message}`,
            cause: options.cause,
            _tag: "WebSocketSerializationError"
        })
    }
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