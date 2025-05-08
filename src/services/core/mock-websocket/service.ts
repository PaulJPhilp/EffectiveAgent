import { AgentRuntimeService } from "@/agent-runtime/service.js"
import { AgentActivity } from "@/agent-runtime/types.js"
import {
    ActivityMessage,
    AgentRuntimeId,
    ErrorMessage,
    ProtocolErrorCodes,
    SendMessage,
    isIncomingMessage,
    isSendMessage,
    isSubscribeMessage,
    isUnsubscribeMessage
} from "@/services/core/websocket/protocol.js"
import { MockWebSocketServerApi } from "@core/mock-websocket/api.js"
import { Cause, Effect, Fiber, HashMap, HashSet, Option, Ref, Scope, Stream, pipe } from "effect"
import { Client, Server } from "mock-socket"

/**
 * Implementation of the mock WebSocket server using Effect.Service pattern.
 * Provides an in-process mock WebSocket server for testing.
 */
export class MockWebSocketServer extends Effect.Service<MockWebSocketServerApi>()(
    "MockWebSocketServer",
    {
        effect: Effect.gen(function* () {
            // State management using Refs for fiber-safety
            const clientSubscriptionsRef = yield* Ref.make(HashMap.empty<Client, HashSet.HashSet<AgentRuntimeId>>())
            const runtimeSubscriptionsRef = yield* Ref.make(HashMap.empty<AgentRuntimeId, HashSet.HashSet<Client>>())
            const subscriptionFibersRef = yield* Ref.make(HashMap.empty<AgentRuntimeId, Fiber.RuntimeFiber<void, Error>>())
            const serverRef = yield* Ref.make<Server | null>(null)

            const mockUrl = "ws://localhost:12345/mock"
            const agentRuntimeService = yield* AgentRuntimeService
            const scope = yield* Scope.Scope
            const runtime = yield* Effect.runtime<never>()

            yield* Effect.logInfo(`Initializing MockWebSocketServer on ${mockUrl}`)
            const serverInstance = new Server(mockUrl)
            yield* Ref.set(serverRef, serverInstance)

            // Handle incoming WebSocket connections
            serverInstance.on("connection", (socket: Client) => {
                Effect.runFork(handleConnection(socket).pipe(
                    Effect.catchAllCause(cause =>
                        Effect.logError("Error in handleConnection fork", { cause: Cause.pretty(cause) })
                    )
                ))
            })

            serverInstance.on("error", (error) => {
                Effect.runSync(Effect.logError("MockWebSocketServer error", { error }))
            })

            /**
             * Handles a client connection to the WebSocket server.
             */
            const handleConnection = (socket: Client): Effect.Effect<void, never> => Effect.gen(function* () {
                yield* Effect.logInfo("Client connected to mock WebSocket server")

                socket.on("message", (data) => {
                    return Effect.runFork(handleMessage(socket, String(data)).pipe(
                        Effect.catchAllCause(cause => Effect.logError("Error in handleMessage fork", { cause: Cause.pretty(cause) })
                        )
                    ))
                })

                socket.on("close", () => {
                    Effect.runFork(handleClose(socket).pipe(
                        Effect.catchAllCause(cause =>
                            Effect.logError("Error in handleClose fork", { cause: Cause.pretty(cause) })
                        )
                    ))
                })
            })

            /**
             * Handles incoming messages from WebSocket clients.
             */
            const handleMessage = (socket: Client, data: string): Effect.Effect<void, never, never> => Effect.gen(function* () {
                // Parse JSON with Effect.try and fallback to null
                const parseResult = yield* Effect.try(() => JSON.parse(data)).pipe(
                    Effect.catchAll(() => Effect.succeed(null)),
                    Effect.either
                )

                if (parseResult._tag === "Left" || parseResult.right === null) {
                    socket.send(JSON.stringify({
                        type: "error",
                        code: ProtocolErrorCodes.PARSE_ERROR,
                        message: "Invalid JSON format"
                    } satisfies ErrorMessage))
                    return
                }

                const message = parseResult.right

                if (!isIncomingMessage(message)) {
                    socket.send(JSON.stringify({
                        type: "error",
                        code: ProtocolErrorCodes.VALIDATION_ERROR,
                        message: "Invalid message format"
                    } satisfies ErrorMessage))
                    return
                }

                if (isSubscribeMessage(message)) {
                    yield* handleSubscribe(socket, message.agentRuntimeId)
                } else if (isUnsubscribeMessage(message)) {
                    yield* handleUnsubscribe(socket, message.agentRuntimeId)
                } else if (isSendMessage(message)) {
                    yield* handleSend(socket, message)
                }
            })

            /**
             * Handles client disconnection, cleaning up subscriptions.
             */
            const handleClose = (socket: Client): Effect.Effect<void, never> => Effect.gen(function* () {
                yield* Effect.logInfo("Client disconnected from mock WebSocket server")

                const clientSubs = yield* Ref.get(clientSubscriptionsRef)
                const agentRuntimeIds = HashMap.get(clientSubs, socket)

                if (Option.isSome(agentRuntimeIds)) {
                    for (const agentRuntimeId of HashSet.values(agentRuntimeIds.value)) {
                        yield* handleUnsubscribe(socket, agentRuntimeId)
                    }
                }
            })

            /**
             * Handles subscribe messages, updating subscription state and starting activity streaming.
             */
            const handleSubscribe = (socket: Client, agentRuntimeId: AgentRuntimeId): Effect.Effect<void, never> => Effect.gen(function* () {
                yield* Effect.logInfo(`Client subscribing to ${agentRuntimeId}`)

                // Update client subscriptions
                yield* Ref.update(clientSubscriptionsRef, clientSubs => {
                    const currentClientSubs = HashMap.get(clientSubs, socket)
                    return HashMap.set(clientSubs, socket, HashSet.add(
                        Option.getOrElse(currentClientSubs, () => HashSet.empty<AgentRuntimeId>()),
                        agentRuntimeId
                    ))
                })

                // Update runtime subscriptions
                yield* Ref.update(runtimeSubscriptionsRef, runtimeSubs => {
                    const currentRuntimeSubs = HashMap.get(runtimeSubs, agentRuntimeId)
                    return HashMap.set(runtimeSubs, agentRuntimeId, HashSet.add(
                        Option.getOrElse(currentRuntimeSubs, () => HashSet.empty<Client>()),
                        socket
                    ))
                })

                // Check if subscription fiber already exists
                const subscriptionFibers = yield* Ref.get(subscriptionFibersRef)
                const fiber = HashMap.get(subscriptionFibers, agentRuntimeId)

                if (Option.isNone(fiber)) {
                    // Start activity subscription if not already running
                    yield* Effect.try(() => {
                        const activityStream = agentRuntimeService.subscribe(agentRuntimeId)
                        const newFiber = Effect.runFork(
                            pipe(
                                activityStream as Stream.Stream<AgentActivity, never>,
                                Stream.tap(activity =>
                                    Effect.gen(function* () {
                                        const runtimeSubs = yield* Ref.get(runtimeSubscriptionsRef)
                                        const clients = HashMap.get(runtimeSubs, agentRuntimeId)

                                        if (Option.isSome(clients)) {
                                            const message: ActivityMessage = {
                                                type: "activity",
                                                agentRuntimeId,
                                                activity
                                            }

                                            for (const client of HashSet.values(clients.value)) {
                                                client.send(JSON.stringify(message))
                                            }
                                        }
                                    })
                                ),
                                Stream.runDrain
                            )
                        )

                        // Update the fiber map with the new subscription fiber
                        Effect.runSync(
                            Ref.update(subscriptionFibersRef, fibers =>
                                HashMap.set(fibers, agentRuntimeId, newFiber)
                            )
                        )
                    }).pipe(
                        Effect.catchAll(error =>
                            Effect.logError(`Failed to subscribe to activity for ${agentRuntimeId}`, { error })
                        ),
                        Effect.orDie
                    )
                }
            })

            /**
             * Handles unsubscribe messages, cleaning up subscriptions and stopping streams.
             */
            const handleUnsubscribe = (socket: Client, agentRuntimeId: AgentRuntimeId): Effect.Effect<void, never> => Effect.gen(function* () {
                yield* Effect.logInfo(`Client unsubscribing from ${agentRuntimeId}`)

                // Update client subscriptions
                yield* Ref.update(clientSubscriptionsRef, clientSubs => {
                    const currentClientSubs = HashMap.get(clientSubs, socket)
                    if (Option.isSome(currentClientSubs)) {
                        return HashMap.set(clientSubs, socket, HashSet.remove(currentClientSubs.value, agentRuntimeId))
                    }
                    return clientSubs
                })

                // Update runtime subscriptions
                const runtimeSubs = yield* Ref.get(runtimeSubscriptionsRef)
                const currentRuntimeSubs = HashMap.get(runtimeSubs, agentRuntimeId)

                if (Option.isSome(currentRuntimeSubs)) {
                    const updatedSubs = HashSet.remove(currentRuntimeSubs.value, socket)

                    if (HashSet.size(updatedSubs) === 0) {
                        // No more subscribers, clean up resources
                        yield* Ref.update(runtimeSubscriptionsRef, subs =>
                            HashMap.remove(subs, agentRuntimeId)
                        )

                        const subscriptionFibers = yield* Ref.get(subscriptionFibersRef)
                        const fiber = HashMap.get(subscriptionFibers, agentRuntimeId)

                        if (Option.isSome(fiber)) {
                            yield* Effect.logDebug(`Stopping subscription fiber for ${agentRuntimeId}`)
                            yield* Fiber.interrupt(fiber.value)

                            yield* Ref.update(subscriptionFibersRef, fibers =>
                                HashMap.remove(fibers, agentRuntimeId)
                            )
                        }
                    } else {
                        // Update with remaining subscribers
                        yield* Ref.update(runtimeSubscriptionsRef, subs =>
                            HashMap.set(subs, agentRuntimeId, updatedSubs)
                        )
                    }
                }
            })

            /**
             * Handles send messages, forwarding them to appropriate subscribers.
             */
            const handleSend = (socket: Client, message: SendMessage): Effect.Effect<void, never> => Effect.gen(function* () {
                yield* Effect.logInfo(`Sending message to ${message.targetAgentRuntimeId}`)

                const runtimeSubs = yield* Ref.get(runtimeSubscriptionsRef)
                const clients = HashMap.get(runtimeSubs, message.targetAgentRuntimeId)

                if (Option.isSome(clients)) {
                    for (const client of HashSet.values(clients.value)) {
                        if (client !== socket) {
                            client.send(JSON.stringify(message))
                        }
                    }
                }
            })

            // Return the public API
            return {
                isActive: (): Effect.Effect<boolean, never> =>
                    Ref.get(serverRef).pipe(
                        Effect.map(server => server !== null)
                    ),

                getUrl: (): Effect.Effect<string, never> =>
                    Effect.succeed(mockUrl)
            }
        }),
        dependencies: []
    }
) { }