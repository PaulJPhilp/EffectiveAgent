import { Effect, Stream } from "effect"
import { WebSocketConnectionError, WebSocketError, WebSocketSendError, WebSocketSerializationError } from "./errors.js"

/**
 * API for the WebSocket service.
 * Defines the interface for WebSocket communication.
 */
export interface WebSocketServiceApi {
    /**
     * Establishes a WebSocket connection to the specified URL
     * 
     * @param url The WebSocket URL to connect to
     * @returns An Effect that completes when the connection is established
     */
    readonly connect: (url: string) => Effect.Effect<void, WebSocketConnectionError>

    /**
     * Disconnects the current WebSocket connection
     * 
     * @returns An Effect that completes when the connection is closed
     */
    readonly disconnect: () => Effect.Effect<void, never>

    /**
     * Sends a message over the WebSocket connection
     * 
     * @template T Message type
     * @param message The message to send
     * @returns An Effect that completes when the message is sent
     */
    readonly send: <T = unknown>(message: T) => Effect.Effect<void, WebSocketSendError | WebSocketSerializationError>

    /**
     * Creates a Stream of messages received over the WebSocket connection
     * 
     * @template R Message type
     * @returns A Stream of received messages
     */
    readonly receive: <R = unknown>() => Stream.Stream<R, WebSocketError | WebSocketSerializationError>
} 