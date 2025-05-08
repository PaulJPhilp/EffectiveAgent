import { Effect } from "effect"

/**
 * API for the mock WebSocket server.
 * Defines the interface for the in-process mock WebSocket server.
 */
export interface MockWebSocketServerApi {
    /**
     * Checks if the mock WebSocket server is currently active
     * 
     * @returns An Effect that resolves to true if the server is active
     */
    isActive: () => Effect.Effect<boolean, never>

    /**
     * Gets the URL of the mock WebSocket server
     * 
     * @returns An Effect that resolves to the server URL
     */
    getUrl: () => Effect.Effect<string, never>
} 