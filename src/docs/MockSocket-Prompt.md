# Design Doc & Plan: EA Framework Mock WebSocket Integration

**Version:** 1.1
**Date:** 2024-07-29
**Author:** AI Assistant (Refined based on user feedback)

**Objective:** Refactor the EffectiveAgent (EA) framework to replace direct function call communication between external clients and the `AgentRuntimeService` with a standard WebSocket interface backed by an in-process Mock WebSocket Server for local development and testing. This aligns with the requirements specified in `/docs/EA-Mock-WebSocket-PRD.md`.

## 1. Technical Design Document

### 1.1. Overview

The current architecture potentially allows external components (like UI layers) to directly invoke methods on the `AgentRuntimeService`. This creates tight coupling. To address this, we will introduce:

1.  A standard `WebSocketService` for clients to interact with, built using the **mandatory** `Effect.Service` class pattern.
2.  A `MockWebSocketServer` that intercepts connections intended for the `WebSocketService` (when configured for local/mock mode), also built using the standard `Effect.Service` class pattern.
3.  The `MockWebSocketServer` will interact with the `AgentRuntimeService` using standard Effect dependency injection.
4.  All communication will occur over a defined JSON-based WebSocket protocol with structured error reporting.

This decouples the client interaction point from the core agent runtime and provides a realistic communication channel simulation for local development and testing scenarios without requiring a separate backend process.

### 1.2. Component Design

#### 1.2.1. `WebSocketService`

Provides a standard interface for interacting with a WebSocket connection. **MUST** adhere to the `Effect.Service` class pattern.

*   **Contract (`src/ea/websocket/service.ts` or `contract.ts`):**
    ```typescript
    import * as Effect from "@effect/io/Effect"
    import * as Stream from "@effect/stream/Stream"
    import * as Context from "@effect/data/Context" // Keep for Tag definition if needed
    import * as Layer from "@effect/io/Layer" // Keep for potential Layer composition utilities
    import * as Cause from "@effect/io/Cause"
    import { pipe } from "@effect/data/Function"

    // Define specific error types
    export class WebSocketError extends Error {
        readonly _tag = "WebSocketError"
        constructor(message: string, readonly cause?: unknown) {
            super(message)
            this.name = "WebSocketError"
        }
    }

    export class WebSocketConnectionError extends WebSocketError {
        readonly _tag = "WebSocketConnectionError"
        constructor(readonly url: string, cause?: unknown) {
            super(`Failed to connect to WebSocket: ${url}`, cause)
            this.name = "WebSocketConnectionError"
        }
    }

    export class WebSocketSendError extends WebSocketError {
        readonly _tag = "WebSocketSendError"
        constructor(message: string, cause?: unknown) {
            super(`Failed to send message: ${message}`, cause)
            this.name = "WebSocketSendError"
        }
    }

    export class WebSocketSerializationError extends WebSocketError {
        readonly _tag = "WebSocketSerializationError"
        constructor(message: string, readonly data: unknown, cause?: unknown) {
            super(`Serialization/Deserialization error: ${message}`, cause)
            this.name = "WebSocketSerializationError"
        }
    }

    export interface IWebSocketService {
        readonly connect: (
            url: string
        ) => Effect.Effect<void, WebSocketConnectionError>
        readonly disconnect: () => Effect.Effect<void, never> // Disconnect is best-effort
        readonly send: <T = unknown>(
            message: T
        ) => Effect.Effect<void, WebSocketSendError | WebSocketSerializationError>
        readonly receive: <R = unknown>() => Stream.Stream<
            R,
            WebSocketError | WebSocketSerializationError
        >
    }

    // Use GenericTag for the service identifier
    export const WebSocketService = Effect.GenericTag<IWebSocketService>(
        "services/WebSocketService"
    )
    ```
*   **Implementation (`src/ea/websocket/live.ts`):**
    *   **MUST** be implemented using the `class WebSocketServiceLive extends Effect.Service<IWebSocketService>()(...)` pattern.
    *   Uses the native `WebSocket` API (assuming browser or Node.js environment with `ws` compatibility).
    *   Manages the WebSocket instance state (`connecting`, `open`, `closing`, `closed`).
    *   `connect`: Creates `new WebSocket(url)`, wraps `onopen` and `onerror` in `Effect.async`.
    *   `disconnect`: Calls `webSocket.close()`.
    *   `send`: Serializes the message to JSON (`JSON.stringify`), calls `webSocket.send()`. Handles potential serialization errors and send errors.
    *   `receive`: Creates a `Stream` that emits deserialized messages (`JSON.parse`) received via the `onmessage` event. Handles `onerror`, `onclose`, and deserialization errors.
    ```typescript
    // Example structure - MUST follow the Effect.Service pattern
    import { WebSocket } from "ws" // Or rely on browser global
    import * as Effect from "@effect/io/Effect"
    import * as Stream from "@effect/stream/Stream"
    import * as Hub from "@effect/io/Hub"
    import * as Scope from "@effect/io/Scope"
    import {
        WebSocketService, // Import the Tag
        IWebSocketService,
        WebSocketError,
        WebSocketConnectionError,
        WebSocketSendError,
        WebSocketSerializationError
    } from "./service" // Adjust path

    export class WebSocketServiceLive extends Effect.Service<IWebSocketService>()(
        WebSocketService, // Provide the Tag as the identifier
        {
            // Define dependencies if any (e.g., Scope, Config)
            dependencies: [Scope.Scope],
            // Implement the service logic within the make function
            make: ({ scope }) => Effect.gen(function* (_) {
                // Use Effect primitives like Hub for managing state and streams
                const receiveHub = yield* _(Hub.unbounded<unknown>()) // For received messages
                const errorHub = yield* _(Hub.unbounded<WebSocketError>()) // For connection/stream errors
                let socket: WebSocket | null = null
                let connectionEffect: Effect.Effect<void, WebSocketConnectionError> | null = null

                const closeSocket = Effect.sync(() => {
                    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
                        socket.close()
                    }
                    socket = null
                    connectionEffect = null // Reset connection effect
                })

                const connect: IWebSocketService["connect"] = (url) => {
                    // Prevent concurrent connections
                    if (connectionEffect) {
                         return connectionEffect
                    }
                     if (socket && socket.readyState === WebSocket.OPEN && socket.url === url) {
                         return Effect.void
                     }
                     // Clean up previous socket if exists but different URL or closed
                     if (socket) {
                         yield* _(closeSocket)
                     }


                    connectionEffect = Effect.async<void, WebSocketConnectionError>((resume) => {
                        try {
                            const ws = new WebSocket(url)
                            socket = ws // Store the socket immediately

                            ws.onopen = () => {
                                connectionEffect = null // Clear effect on success
                                resume(Effect.void)
                            }

                            ws.onerror = (event) => {
                                const error = new WebSocketConnectionError(url, event.message || "WebSocket connection error")
                                socket = null // Clear socket on error
                                connectionEffect = null // Clear effect on error
                                Effect.runFork(Hub.publish(errorHub, error)) // Publish error for receive stream
                                resume(Effect.fail(error))
                            }

                            ws.onmessage = (event) => {
                                try {
                                    const data = JSON.parse(event.data.toString())
                                    Effect.runFork(Hub.publish(receiveHub, data))
                                } catch (e) {
                                    const error = new WebSocketSerializationError("Failed to parse incoming message", event.data, e)
                                     Effect.runFork(Hub.publish(errorHub, error)) // Publish parse error
                                }
                            }

                            ws.onclose = () => {
                                // Only signal closure as an error if it wasn't initiated by disconnect()
                                if (socket) { // if socket is still set, it means close wasn't graceful/expected
                                    const error = new WebSocketError("WebSocket closed unexpectedly")
                                     Effect.runFork(Hub.publish(errorHub, error))
                                }
                                 socket = null
                                 connectionEffect = null
                                // Hub is automatically shut down by scope finalizer
                            }
                        } catch (e) {
                             const error = new WebSocketConnectionError(url, e)
                             socket = null
                             connectionEffect = null
                             Effect.runFork(Hub.publish(errorHub, error))
                             resume(Effect.fail(error))
                        }
                    }).pipe(
                         // Ensure connection effect is cleared even if fiber is interrupted
                         Effect.ensuring(Effect.sync(() => { connectionEffect = null })),
                         Effect.interruptible // Allow interruption
                    )
                    return connectionEffect
                }

                const disconnect: IWebSocketService["disconnect"] = closeSocket // Use the helper

                const send: IWebSocketService["send"] = <T = unknown>(message: T) =>
                    Effect.try({
                        try: () => {
                            if (!socket || socket.readyState !== WebSocket.OPEN) {
                                throw new WebSocketSendError("WebSocket not open")
                            }
                            const serialized = JSON.stringify(message)
                            socket.send(serialized)
                        },
                        catch: (e) => {
                            if (e instanceof WebSocketSendError) return e
                            // Assume serialization error otherwise
                            return new WebSocketSerializationError("Failed to serialize message", message, e)
                        }
                    })

                const receive: IWebSocketService["receive"] = <R = unknown>() =>
                    Stream.merge(
                        Stream.fromHub(receiveHub),
                        Stream.fromHub(errorHub).pipe(Stream.flatMap(Effect.fail))
                    ) as Stream.Stream<R, WebSocketError | WebSocketSerializationError> // Cast needed

                // Ensure socket is closed when the service scope ends
                yield* _(Scope.addFinalizer(scope, closeSocket))

                return { connect, disconnect, send, receive } satisfies IWebSocketService
            })
        }
    )

    // Export the class itself as the Layer
    export const WebSocketServiceLayer = WebSocketServiceLive
    ```
*   **Error Handling:** Uses the defined `WebSocketError` subtypes. `receive` stream fails on errors. `connect` and `send` Effects fail on errors.

#### 1.2.2. `MockWebSocketServer`

Intercepts WebSocket connections to a specific mock URL and routes messages between the mock client and the `AgentRuntimeService`. **MUST** adhere to the `Effect.Service` class pattern. Runs *in-process*.

*   **Dependencies:**
    *   `mock-socket`: To create the mock server (`Server` class).
    *   `AgentRuntimeService`: To send inputs and subscribe to activities.
    *   `Scope`: For managing background fibers.
    *   `Runtime`: For running effects outside Effect context (e.g., in event handlers).
    *   `ConfigurationService` (optional): To get the mock URL.
*   **Contract (`src/ea/mock-websocket/service.ts`):**
    ```typescript
    import * as Effect from "@effect/io/Effect"

    // No explicit methods needed for external users,
    // its existence in the Layer enables the mocking.
    // We might add a status/check method if needed.
    export interface IMockWebSocketServer {
        readonly isActive: Effect.Effect<boolean> // Example status method
    }

    // Use GenericTag for the service identifier
    export const MockWebSocketServer = Effect.GenericTag<IMockWebSocketServer>(
        "services/MockWebSocketServer"
    )
    ```
*   **Implementation (`src/ea/mock-websocket/live.ts`):**
    *   **MUST** be implemented using the `class MockWebSocketServerLive extends Effect.Service<IMockWebSocketServer>()(...)` pattern.
    *   **Integration:** Uses `new Server(mockUrl)` from `mock-socket`. The `mockUrl` (e.g., `ws://localhost:12345/mock`) should be configurable.
    *   **Error Handling Emphasis:** Effects forked using `Effect.runFork` (e.g., in `connection`, `message`, `close` handlers) **must** contain their own robust error handling and logging, as failures will not propagate back to a parent Effect context.
    *   **Refined Error Sending (`sendError`):** This method should serialize errors according to the protocol (see Section 1.2.4), including error codes/types, and **must not** leak internal implementation details like stack traces.
    *   **Subscription Efficiency Note:** The current approach subscribes to the entire `AgentRuntimeService` stream for a given `AgentRuntimeId` when the *first* client subscribes. This is acceptable for local testing but could be optimized if performance with many agents/few listeners becomes a concern in the future.
        ```typescript
        import { Server, WebSocket } from "mock-socket"
        import * as Effect from "@effect/io/Effect"
        import * as Layer from "@effect/io/Layer"
        import * as Scope from "@effect/io/Scope"
        import * as Stream from "@effect/stream/Stream"
        import * as AgentRuntimeService from "../runtime/agent-runtime-service" // Adjust path
        import * as Runtime from "@effect/io/Runtime"
        import * as Fiber from "@effect/io/Fiber"
        import { pipe } from "@effect/data/Function"
        import * as Option from "@effect/data/Option"
        import * as Cause from "@effect/io/Cause"
        import * as HashMap from "@effect/data/HashMap"
        import * as HashSet from "@effect/data/HashSet"
        import {
             MockWebSocketServer, // Import the Tag
             IMockWebSocketServer
        } from "./service"
        import {
            IncomingMessage, SendMessage, SubscribeMessage, UnsubscribeMessage,
            OutgoingMessage, ActivityMessage, ErrorMessage,
            AgentActivity, AgentRuntimeId, ProtocolErrorCodes // Import protocol definitions
        } from "../websocket/protocol" // Adjust path


        export class MockWebSocketServerLive extends Effect.Service<IMockWebSocketServer>()(
            MockWebSocketServer,
            {
                // Define dependencies
                dependencies: [
                    AgentRuntimeService.AgentRuntimeService, // Use the Tag
                    Scope.Scope,
                    Runtime.Runtime<never> // Assuming no specific R requirement for runtime
                    // Add Config service if needed for mockUrl
                ],
                // Implement the service logic
                make: ({ agentRuntimeService, scope, runtime }) => Effect.gen(function* (_) {
                    let server: Server | null = null
                    const mockUrl = "ws://localhost:12345/mock" // TODO: Make configurable via Config service

                    // State management
                    let clientSubscriptions = HashMap.empty<WebSocket, HashSet.HashSet<AgentRuntimeId>>()
                    let runtimeSubscriptions = HashMap.empty<AgentRuntimeId, HashSet.HashSet<WebSocket>>()
                    let subscriptionFibers = HashMap.empty<AgentRuntimeId, Fiber.RuntimeFiber<never, void>>()


                    const initialize = Effect.acquireRelease(
                        Effect.gen(function* (_) {
                            yield* _(Effect.logInfo(`Initializing MockWebSocketServer on ${mockUrl}`))
                            const serverInstance = new Server(mockUrl)
                            server = serverInstance // Assign to outer scope variable

                            serverInstance.on("connection", (socket: WebSocket) => {
                                // Fork connection handling; MUST handle errors internally
                                Effect.runFork(handleConnection(socket).pipe(
                                    Effect.catchAllCause(cause =>
                                        Effect.logError("Error in handleConnection fork", Cause.pretty(cause))
                                    )
                                ), { runtime })
                            })

                            serverInstance.on("error", (error) => {
                                // Log server-level errors
                                Effect.runSync(Effect.logError("MockWebSocketServer error", error), { runtime })
                            })

                            return serverInstance // Return the server for release
                        }),
                        (serverInstance) => Effect.sync(() => {
                            Effect.runSync(Effect.logInfo("Closing MockWebSocketServer"), { runtime })
                            serverInstance.close()
                            server = null
                            // Clean up state and interrupt fibers
                            clientSubscriptions = HashMap.empty()
                            runtimeSubscriptions = HashMap.empty()
                            HashMap.forEach(subscriptionFibers, fiber => Effect.runFork(Fiber.interrupt(fiber), { runtime }))
                            subscriptionFibers = HashMap.empty()
                        })
                    )

                    // Acquire the server resource within the service's scope
                    yield* _(Scope.extend(initialize, scope))


                    function handleConnection(socket: WebSocket): Effect.Effect<void> {
                        return Effect.gen(function* (_) {
                            yield* _(Effect.logDebug("Mock client connected"))
                            clientSubscriptions = HashMap.set(clientSubscriptions, socket, HashSet.empty())

                            socket.on("message", (data) => {
                                // Fork message handling; MUST handle errors internally
                                Effect.runFork(handleMessage(socket, data).pipe(
                                    Effect.catchAllCause(cause =>
                                        Effect.logError("Error in handleMessage fork", Cause.pretty(cause))
                                    )
                                ), { runtime })
                            })

                            socket.on("close", () => {
                                 // Fork disconnect handling; MUST handle errors internally
                                 Effect.runFork(handleDisconnect(socket).pipe(
                                     Effect.catchAllCause(cause =>
                                         Effect.logError("Error in handleDisconnect fork", Cause.pretty(cause))
                                     )
                                 ), { runtime })
                            })

                            socket.on("error", (error) => {
                                 Effect.runFork(
                                     Effect.logWarning("Mock client WebSocket error", error),
                                     { runtime }
                                 )
                                 // Fork disconnect handling on error; MUST handle errors internally
                                 Effect.runFork(handleDisconnect(socket).pipe(
                                      Effect.catchAllCause(cause =>
                                          Effect.logError("Error in handleDisconnect fork (from error)", Cause.pretty(cause))
                                      )
                                  ), { runtime })
                            })
                        })
                    }

                    function handleMessage(socket: WebSocket, data: unknown): Effect.Effect<void> {
                        return Effect.gen(function* (_) {
                            let message: IncomingMessage
                            try {
                                if (typeof data !== "string") {
                                    throw new Error("Invalid message format, expected string.")
                                }
                                // TODO: Add robust validation (e.g., using Schema)
                                message = JSON.parse(data) as IncomingMessage
                                yield* _(Effect.logDebug({ message: "Received message from mock client", data: message }))
                            } catch (e) {
                                yield* _(sendError(socket, "Failed to parse incoming message", ProtocolErrorCodes.PARSE_ERROR, e))
                                return
                            }

                            switch (message.type) {
                                case "send":
                                    yield* _(routeSendToRuntime(socket, message))
                                    break
                                case "subscribe":
                                    yield* _(handleSubscriptionUpdate(socket, message.agentRuntimeId, true))
                                    break
                                case "unsubscribe":
                                    yield* _(handleSubscriptionUpdate(socket, message.agentRuntimeId, false))
                                    break
                                default:
                                    yield* _(sendError(socket, `Unknown message type: ${(message as any).type}`, ProtocolErrorCodes.UNKNOWN_MESSAGE_TYPE))
                            }
                        })
                    }

                    function routeSendToRuntime(socket: WebSocket, message: SendMessage): Effect.Effect<void> {
                         return pipe(
                             agentRuntimeService.send(message.targetAgentRuntimeId, message.payload),
                             Effect.tapError(error =>
                                sendError(socket, `AgentRuntimeService failed to process input for ${message.targetAgentRuntimeId}`, ProtocolErrorCodes.AGENT_RUNTIME_SEND_FAILED, error)
                             ),
                             Effect.catchAll(() => Effect.void) // Error already sent to client
                         )
                    }

                    function handleSubscriptionUpdate(socket: WebSocket, agentRuntimeId: AgentRuntimeId, subscribe: boolean): Effect.Effect<void> {
                        return Effect.gen(function* (_) {
                             // Update clientSubscriptions
                             const currentClientSubs = HashMap.get(clientSubscriptions, socket)
                             if (Option.isNone(currentClientSubs)) return // Should not happen

                             const updatedClientSubs = subscribe
                                 ? HashSet.add(currentClientSubs.value, agentRuntimeId)
                                 : HashSet.remove(currentClientSubs.value, agentRuntimeId)
                             clientSubscriptions = HashMap.set(clientSubscriptions, socket, updatedClientSubs)

                             // Update runtimeSubscriptions
                             const currentRuntimeSubs = HashMap.getOrElse(runtimeSubscriptions, agentRuntimeId, () => HashSet.empty<WebSocket>())
                             const updatedRuntimeSubs = subscribe
                                 ? HashSet.add(currentRuntimeSubs, socket)
                                 : HashSet.remove(currentRuntimeSubs, socket)

                             if (HashSet.size(updatedRuntimeSubs) === 0) {
                                 // No clients interested anymore
                                 runtimeSubscriptions = HashMap.remove(runtimeSubscriptions, agentRuntimeId)
                                 const fiber = HashMap.get(subscriptionFibers, agentRuntimeId)
                                 if (Option.isSome(fiber)) {
                                     yield* _(Effect.logDebug(`Stopping subscription fiber for ${agentRuntimeId}`))
                                     yield* _(Fiber.interrupt(fiber.value))
                                     subscriptionFibers = HashMap.remove(subscriptionFibers, agentRuntimeId)
                                 }
                             } else {
                                 // Still clients interested
                                 runtimeSubscriptions = HashMap.set(runtimeSubscriptions, agentRuntimeId, updatedRuntimeSubs)
                                 // Start fiber if this is the first client subscribing
                                 if (subscribe && !HashMap.has(subscriptionFibers, agentRuntimeId)) {
                                     yield* _(Effect.logDebug(`Starting subscription fiber for ${agentRuntimeId}`))
                                     const fiber = yield* _(
                                         subscribeToAgentActivities(agentRuntimeId),
                                         Effect.forkIn(scope) // Fork within the service's scope
                                     )
                                     subscriptionFibers = HashMap.set(subscriptionFibers, agentRuntimeId, fiber)
                                 }
                             }
                        })
                    }

                    // Note: Subscribes fully upon first client interest. Simple for demos, potential optimization point.
                    function subscribeToAgentActivities(agentRuntimeId: AgentRuntimeId): Effect.Effect<void, never> {
                         return pipe(
                             agentRuntimeService.subscribe(agentRuntimeId),
                             Stream.runForEach(activity => routeActivityToClients(agentRuntimeId, activity)),
                             Effect.catchAllCause(cause => Effect.logError( // Log stream errors
                                 `Subscription stream failed for ${agentRuntimeId}`,
                                 Cause.pretty(cause)
                             )),
                             Effect.ensuring(Effect.sync(() => { // Cleanup fiber map
                                  subscriptionFibers = HashMap.remove(subscriptionFibers, agentRuntimeId)
                             }))
                         )
                    }


                    function routeActivityToClients(agentRuntimeId: AgentRuntimeId, activity: AgentActivity): Effect.Effect<void> {
                        return Effect.gen(function* (_) {
                            const subscribedSockets = HashMap.get(runtimeSubscriptions, agentRuntimeId)
                             if (Option.isNone(subscribedSockets) || HashSet.size(subscribedSockets.value) === 0) {
                                 return // No listeners
                             }

                            const message: ActivityMessage = { type: "activity", agentRuntimeId, activity }
                            let serializedMessage: string
                            try {
                                serializedMessage = JSON.stringify(message)
                            } catch (e) {
                                yield* _(Effect.logError("Failed to serialize AgentActivity", { error: e, activity }))
                                // Maybe send an error back to clients?
                                return
                            }

                            // Send concurrently
                             const sendEffects = Array.from(subscribedSockets.value).map(socket =>
                                 Effect.try({
                                     try: () => socket.send(serializedMessage),
                                     catch: (e) => Effect.logWarning("Failed to send activity to mock client", { agentRuntimeId, error: e }) // Log send failure
                                 })
                             )
                             yield* _(Effect.all(sendEffects, { discard: true, concurrency: 5 }))
                        })
                    }

                     function handleDisconnect(socket: WebSocket): Effect.Effect<void> {
                         return Effect.gen(function* (_) {
                            yield* _(Effect.logDebug("Mock client disconnected"))
                            const clientSubs = HashMap.get(clientSubscriptions, socket)
                            if (Option.isSome(clientSubs)) {
                                // Unsubscribe this client from all its runtimes
                                const unsubEffects = Array.from(clientSubs.value).map(agentRuntimeId =>
                                    handleSubscriptionUpdate(socket, agentRuntimeId, false) // Reuse logic
                                )
                                yield* _(Effect.all(unsubEffects, { discard: true }))
                            }
                             clientSubscriptions = HashMap.remove(clientSubscriptions, socket) // Remove client finally
                         })
                     }

                    // Refined: Sends structured error, avoids leaking details
                    function sendError(socket: WebSocket, message: string, code: ProtocolErrorCodes, internalError?: unknown): Effect.Effect<void> {
                         return Effect.try({
                             try: () => {
                                 const errorMsg: ErrorMessage = {
                                     type: "error",
                                     code: code,
                                     message: message,
                                     // Only include minimal details if safe and necessary
                                     details: internalError instanceof Error ? internalError.name : undefined
                                 }
                                 socket.send(JSON.stringify(errorMsg))
                             },
                             catch: (e) => Effect.logWarning("Failed to send error message to mock client", { code, message, error: e })
                         }).pipe(Effect.catchAll(() => Effect.void)) // Don't let sendError fail the calling effect
                    }

                    const isActive = Effect.sync(() => server !== null && !server.closed)


                    return { isActive } satisfies IMockWebSocketServer
                })
            }
        )

        // Export the class itself as the Layer
        export const MockWebSocketServerLayer = MockWebSocketServerLive
        ```

#### 1.2.3. `AgentRuntimeService` Modifications

*   **Confirmation:** Remains *unlikely* that `AgentRuntimeService` itself needs modification.
*   **Requirement:** Re-emphasize that the critical change is ensuring *no other part of the system* directly calls `AgentRuntimeService.send/subscribe`. All interaction **must** go via the `WebSocketService`.

#### 1.2.4. Serialization Protocol (`src/ea/websocket/protocol.ts`)

Refined to include structured error codes.

```typescript
// src/ea/websocket/protocol.ts

// Define AgentRuntimeId and AgentActivity based on actual framework types
export type AgentRuntimeId = string // Or Brand<string, "AgentRuntimeId"> etc.

export interface AgentActivity {
    // Structure based on actual AgentActivity definition
    readonly sequence: number
    readonly timestamp: string // ISO 8601
    readonly type: "input" | "output" | "error" | "status" // Example types
    readonly payload: unknown
    readonly agentRuntimeId: AgentRuntimeId
}

// --- Incoming Messages (Client -> Server) ---
export type IncomingMessageType = "send" | "subscribe" | "unsubscribe"
// ... (SendMessage, SubscribeMessage, UnsubscribeMessage interfaces remain the same) ...
export type IncomingMessage = SendMessage | SubscribeMessage | UnsubscribeMessage

// --- Outgoing Messages (Server -> Client) ---
export type OutgoingMessageType = "activity" | "error"

export interface BaseOutgoingMessage {
    type: OutgoingMessageType
}

export interface ActivityMessage extends BaseOutgoingMessage {
    type: "activity"
    agentRuntimeId: AgentRuntimeId
    activity: AgentActivity
}

// Refined Error Message
export enum ProtocolErrorCodes {
    UNKNOWN_ERROR = "UNKNOWN_ERROR",
    PARSE_ERROR = "PARSE_ERROR",
    VALIDATION_ERROR = "VALIDATION_ERROR", // If adding validation
    AGENT_RUNTIME_SEND_FAILED = "AGENT_RUNTIME_SEND_FAILED",
    AGENT_RUNTIME_SUBSCRIBE_FAILED = "AGENT_RUNTIME_SUBSCRIBE_FAILED", // If subscribe can fail initially
    SERIALIZATION_ERROR = "SERIALIZATION_ERROR",
    UNAUTHORIZED = "UNAUTHORIZED", // If adding auth later
    UNKNOWN_MESSAGE_TYPE = "UNKNOWN_MESSAGE_TYPE",
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR", // Catch-all for server issues
}

export interface ErrorMessage extends BaseOutgoingMessage {
    type: "error"
    code: ProtocolErrorCodes
    message: string // User-friendly message
    details?: string // Optional: Non-sensitive context (e.g., error type name)
}

export type OutgoingMessage = ActivityMessage | ErrorMessage

// ... (Helper type guards remain the same) ...
```

#### 1.2.5. Setup/Configuration

*   **Mechanism:** Use Effect Layers. Provide `MockWebSocketServerLayer` to enable the mock environment.
*   **Configuration:** The mock URL should be read via `Effect.Config` or `ConfigurationService` injected into `MockWebSocketServerLive`.
*   **Wiring:**
    ```typescript
    // Example main application setup
    import * as Effect from "@effect/io/Effect"
    import * as Layer from "@effect/io/Layer"
    import { WebSocketService } from "./ea/websocket/service"
    import { WebSocketServiceLayer } from "./ea/websocket/live" // Import Layer (the class)
    import { MockWebSocketServerLayer } from "./ea/mock-websocket/live" // Import Layer (the class)
    import { AgentRuntimeServiceLayer } from "./ea/runtime/agent-runtime-service-live" // Adjust path

    // Assume Config Service provides isMockMode and mockUrl/realUrl
    const program = Effect.gen(function* (_) {
        // const config = yield* _(ConfigurationService) // Assuming a Config service
        const isMockMode = true // Read from config
        const url = isMockMode ? "ws://localhost:12345/mock" : "wss://real.service" // Read from config

        const ws = yield* _(WebSocketService)
        yield* _(ws.connect(url))
        // Use ws.send, ws.receive
    })

    // Determine layers based on mode
    const isMockMode = true // Read from config service or env
    const webSocketStackLayer = isMockMode
        ? Layer.merge(WebSocketServiceLayer, MockWebSocketServerLayer) // Mock mode needs both
        : WebSocketServiceLayer // Non-mock only needs the client service

    // Compose the final layer
    const AppLayer = Layer.provide(
        webSocketStackLayer,
        AgentRuntimeServiceLayer // Provide ARS needed by Mock Server
        // Add ConfigurationLayer, LoggingLayer etc.
    )

    // Run the application
    // Effect.runPromise(Effect.provide(program, AppLayer))
    ```

### 1.3. Interaction Flows (Mermaid)

*   (Diagrams remain the same as Version 1.0, but the underlying implementation uses the `Effect.Service` pattern and refined error handling).

### 1.4. External API Considerations

*   **`Stream` to `AsyncIterable`:** Note that the `WebSocketService.receive()` method returns an Effect `Stream`. If a higher-level client API (e.g., within `EffectiveAgentRuntime`) aims to expose agent activities as a JavaScript `AsyncIterable` (for use with `for await...of`), careful implementation is required to bridge the Effect `Stream` to the `AsyncIterable` interface, handling backpressure, finalization, and error propagation correctly. This conversion is outside the scope of the WebSocket service itself but is an important consideration for the consuming code.

## 2. Implementation Plan

### 2.1. Phase 1: Core WebSocket Service & Protocol

*   **Task 1.1: Define Protocol:** Create `src/ea/websocket/protocol.ts`. Define `AgentRuntimeId`, `AgentActivity`, message types, and **`ProtocolErrorCodes` enum** for structured errors. Add type guards.
*   **Task 1.2: Define Service Contract:** Create `src/ea/websocket/service.ts`. Define `WebSocketError` subtypes, `IWebSocketService` interface, and `WebSocketService` **`Effect.GenericTag`**.
*   **Task 1.3: Implement Live Service:** Create `src/ea/websocket/live.ts`. Implement `WebSocketServiceLive` **strictly following the `class ServiceName extends Effect.Service...` pattern**. Export the class as `WebSocketServiceLayer`.
*   **Task 1.4: Basic Unit Tests:** Add unit tests for `WebSocketServiceLive`, verifying adherence to the interface and basic functionality (connect, disconnect, send, receive).

### 2.2. Phase 2: Mock WebSocket Server

*   **Task 2.1: Add Dependency:** Add `mock-socket`.
*   **Task 2.2: Define Service Contract:** Create `src/ea/mock-websocket/service.ts`. Define `IMockWebSocketServer` interface and `MockWebSocketServer` **`Effect.GenericTag`**.
*   **Task 2.3: Implement Live Service & Layer:** Create `src/ea/mock-websocket/live.ts`.
    *   Implement `MockWebSocketServerLive` **strictly following the `class ServiceName extends Effect.Service...` pattern**. Export the class as `MockWebSocketServerLayer`.
    *   Inject dependencies (`AgentRuntimeService` Tag, `Scope`, `Runtime`, optional `Config`).
    *   Implement state management, connection/message/disconnect handlers using `mock-socket`.
    *   Implement `sendError` to use **`ProtocolErrorCodes`** and avoid leaking internal details.
    *   Implement routing logic (`send` -> `ARS.send`, `ARS.subscribe` -> `activity`).
    *   **Crucially:** Ensure robust error handling and logging within all effects passed to **`Effect.runFork`**.
    *   Acknowledge subscription efficiency note in comments if applicable.
*   **Task 2.4: Unit Tests:** Add unit tests for `MockWebSocketServerLive`. Mock `AgentRuntimeService` and client sockets. Test:
    *   Connection/message/disconnect handling.
    *   Routing logic (send, subscribe, unsubscribe, activity).
    *   **Structured error sending** via `sendError`.
    *   Cleanup logic (disconnects, server close).
    *   **Error paths within forked effects**.

### 2.3. Phase 3: Configuration & Integration

*   **Task 3.1: Refactor Direct Calls:** Search and replace any direct calls to `AgentRuntimeService` methods with usage of `WebSocketService`. Update tests. **Verify no direct calls remain.**
*   **Task 3.2: Configure Mock URL:** Implement configuration reading (e.g., via `Effect.Config`) in `MockWebSocketServerLive`. Document configuration.
*   **Task 3.3: Application Wiring:** Update main application setup example to show conditional Layer composition (`MockWebSocketServerLayer`) and URL usage based on configuration.
*   **Task 3.4: Integration Testing:** Create integration tests using the full Layer stack (`AgentRuntimeServiceLayer`, `MockWebSocketServerLayer`, `WebSocketServiceLayer`). Test end-to-end message flow, including sending commands, receiving activities, and receiving **structured errors**.

### 2.4. File Structure Proposal

*   (Structure remains the same as Version 1.0).

### 2.5. Testing Strategy Summary

1.  **Unit Tests:** Focus on individual service logic, mocking dependencies. Verify adherence to the `Effect.Service` pattern structure. Test **error handling within forked effects**.
2.  **Integration Tests:** Test the composed system using Layers. Verify communication flow and **structured error propagation** through the WebSocket mock.
3.  **Refactoring Verification:** Ensure no direct calls to `AgentRuntimeService` remain and previously related tests pass using the `WebSocketService`.

This updated design and plan incorporate the requested refinements, enforce the standard `Effect.Service` pattern, improve error handling clarity, and acknowledge implementation nuances, providing a more robust foundation for the refactoring effort.