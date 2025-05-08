import { Effect, Queue, Scope, Stream } from "effect"
import { WebSocket } from "ws"
import { WebSocketServiceApi } from "./api.js"
import { WebSocketConnectionError, WebSocketError, WebSocketSendError, WebSocketSerializationError } from "./errors.js"

/**
 * Implementation of the WebSocket service using Effect.Service pattern.
 * Provides utilities for WebSocket communication.
 */
export class WebSocketService extends Effect.Service<WebSocketServiceApi>()(
    "WebSocketService",
    {
        effect: Effect.gen(function* () {
            const scope = yield* Scope.Scope
            const receiveQueue = yield* Queue.unbounded<unknown>()
            const errorQueue = yield* Queue.unbounded<WebSocketError>()
            let socket: WebSocket | null = null
            let connectionEffect: Effect.Effect<void, WebSocketConnectionError> | null = null

            const closeSocket = Effect.sync(() => {
                if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
                    socket.close()
                }
                socket = null
                connectionEffect = null
            })

            const connect = (url: string): Effect.Effect<void, WebSocketConnectionError> => {
                return Effect.gen(function* () {
                    if (connectionEffect) {
                        return yield* connectionEffect
                    }
                    if (socket && socket.readyState === WebSocket.OPEN && socket.url === url) {
                        return
                    }
                    if (socket) {
                        yield* closeSocket
                    }
                    connectionEffect = Effect.async<void, WebSocketConnectionError>((resume) => {
                        const createSocket = Effect.try({
                            try: () => new WebSocket(url),
                            catch: (e) => new WebSocketConnectionError({
                                url,
                                message: e instanceof Error ? e.message : String(e),
                                cause: e
                            })
                        })
                        Effect.runSync(createSocket.pipe(
                            Effect.map(ws => {
                                socket = ws
                                ws.onopen = () => {
                                    connectionEffect = null
                                    resume(Effect.succeed(undefined))
                                }
                                ws.onerror = (event) => {
                                    const error = new WebSocketConnectionError({
                                        url,
                                        message: "WebSocket connection error",
                                        cause: event
                                    })
                                    socket = null
                                    connectionEffect = null
                                    Effect.runFork(Queue.offer(errorQueue, error))
                                    resume(Effect.fail(error))
                                }
                                ws.onmessage = (event) => {
                                    Effect.runFork(
                                        Effect.try({
                                            try: () => JSON.parse(event.data.toString()),
                                            catch: (e) => new WebSocketSerializationError({
                                                message: "Failed to parse incoming message",
                                                data: event.data,
                                                cause: e
                                            })
                                        }).pipe(
                                            Effect.flatMap(data => Queue.offer(receiveQueue, data)),
                                            Effect.catchAll(error => Queue.offer(errorQueue, error))
                                        )
                                    )
                                }
                                ws.onclose = () => {
                                    if (socket) {
                                        const error = new WebSocketError({
                                            message: "WebSocket closed unexpectedly",
                                            _tag: "WebSocketError"
                                        })
                                        Effect.runFork(Queue.offer(errorQueue, error))
                                    }
                                    socket = null
                                    connectionEffect = null
                                }
                            }),
                            Effect.catchAll(error => {
                                socket = null
                                connectionEffect = null
                                Effect.runFork(Queue.offer(errorQueue, error))
                                return Effect.fail(error)
                            })
                        ))
                    }).pipe(
                        Effect.ensuring(Effect.sync(() => { connectionEffect = null })),
                        Effect.interruptible
                    )
                    return yield* connectionEffect
                })
            }

            const disconnect = (): Effect.Effect<void, never> => closeSocket

            const send = <T = unknown>(message: T): Effect.Effect<void, WebSocketSendError | WebSocketSerializationError> =>
                Effect.try({
                    try: () => {
                        if (!socket || socket.readyState !== WebSocket.OPEN) {
                            throw new WebSocketSendError({
                                message: "WebSocket not open"
                            })
                        }
                        const serialized = JSON.stringify(message)
                        socket.send(serialized)
                    },
                    catch: (e) => {
                        if (e instanceof WebSocketSendError) return e
                        return new WebSocketSerializationError({
                            message: "Failed to serialize message",
                            data: message,
                            cause: e
                        })
                    }
                })

            const receive = <R = unknown>(): Stream.Stream<R, WebSocketError | WebSocketSerializationError> =>
                Stream.merge(
                    Stream.fromQueue(receiveQueue) as Stream.Stream<R, never, never>,
                    Stream.fromQueue(errorQueue).pipe(
                        Stream.filter((e): e is WebSocketError | WebSocketSerializationError =>
                            (e._tag as string) === "WebSocketError" || (e._tag as string) === "WebSocketSerializationError"
                        ),
                        Stream.flatMap(Effect.fail)
                    )
                )

            yield* Scope.addFinalizer(scope, closeSocket)

            return {
                connect,
                disconnect,
                send,
                receive
            }
        })
    }
) { }