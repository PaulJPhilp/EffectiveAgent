import { Effect, Queue, Scope, Stream } from "effect";
import { WebSocket } from "ws";
import { WebSocketServiceApi } from "./api.js";
import { WebSocketConnectionError, WebSocketError, WebSocketSendError, WebSocketSerializationError } from "./errors.js";

/**
 * Canonical Effect.Service implementation for WebSocketService.
 * No Tag, no static Live, no Layer. All logic is in the effect property.
 */
export class WebSocketService extends Effect.Service<WebSocketServiceApi>()(
    "WebSocketService",
    {
        effect: Effect.gen(function* () {
            yield* Effect.logDebug("Initializing WebSocketService");

            const scope = yield* Scope.Scope
            const receiveQueue = yield* Queue.unbounded<unknown>()
            const errorQueue = yield* Queue.unbounded<WebSocketError>()
            let socket: WebSocket | null = null
            let connectionEffect: Effect.Effect<void, WebSocketConnectionError> | null = null

            const closeSocket = Effect.gen(function* () {
                if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
                    yield* Effect.logDebug("Closing WebSocket connection", { url: socket.url });
                    socket.close()
                }
                socket = null
                connectionEffect = null
            })

            const connect = (url: string): Effect.Effect<void, WebSocketConnectionError> => {
                return Effect.gen(function* () {
                    yield* Effect.logDebug("Attempting WebSocket connection", { url });

                    if (connectionEffect) {
                        yield* Effect.logDebug("Using existing connection effect");
                        return yield* connectionEffect
                    }
                    if (socket && socket.readyState === WebSocket.OPEN && socket.url === url) {
                        yield* Effect.logDebug("WebSocket already connected to this URL");
                        return
                    }
                    if (socket) {
                        yield* Effect.logDebug("Closing existing WebSocket before new connection");
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
                                    Effect.runFork(Effect.logInfo("WebSocket connected successfully", { url }));
                                    connectionEffect = null
                                    resume(Effect.succeed(undefined))
                                }
                                ws.onerror = (event) => {
                                    const error = new WebSocketConnectionError({
                                        url,
                                        message: "WebSocket connection error",
                                        cause: event
                                    })
                                    Effect.runFork(Effect.logError("WebSocket connection error", { url, error }));
                                    socket = null
                                    connectionEffect = null
                                    Effect.runFork(Queue.offer(errorQueue, error))
                                    resume(Effect.fail(error))
                                }
                                ws.onmessage = (event) => {
                                    const dataSize = typeof event.data === 'string'
                                        ? event.data.length
                                        : event.data instanceof ArrayBuffer
                                            ? event.data.byteLength
                                            : event.data instanceof Blob
                                                ? event.data.size
                                                : -1; // fallback for other types
                                    
                                    Effect.runFork(Effect.logDebug("WebSocket message received", { dataSize }));
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
                                            Effect.catchAll(error => {
                                                Effect.runFork(Effect.logError("WebSocket message parsing failed", { error }));
                                                return Queue.offer(errorQueue, error);
                                            })
                                        )
                                    )
                                }
                                ws.onclose = () => {
                                    if (socket) {
                                        const error = new WebSocketError({
                                            message: "WebSocket closed unexpectedly",
                                            _tag: "WebSocketError"
                                        })
                                        Effect.runFork(Effect.logWarning("WebSocket closed unexpectedly", { url }));
                                        Effect.runFork(Queue.offer(errorQueue, error))
                                    }
                                    socket = null
                                    connectionEffect = null
                                }
                            }),
                            Effect.catchAll(error => {
                                Effect.runFork(Effect.logError("WebSocket creation failed", { url, error }));
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

            const disconnect = (): Effect.Effect<void, never> =>
                Effect.gen(function* () {
                    yield* Effect.logDebug("Disconnecting WebSocket");
                    yield* closeSocket;
                    yield* Effect.logDebug("WebSocket disconnected");
                });

            const send = <T = unknown>(message: T): Effect.Effect<void, WebSocketSendError | WebSocketSerializationError> =>
                Effect.gen(function* () {
                    yield* Effect.logDebug("Sending WebSocket message");

                    yield* Effect.try({
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
                    });

                    yield* Effect.logDebug("WebSocket message sent successfully");
                });

            function isWebSocketErrorType(e: unknown): e is WebSocketError | WebSocketSerializationError {
                return typeof e === "object" && e !== null &&
                    "_tag" in e &&
                    ((e as { _tag: string })._tag === "WebSocketError" ||
                        (e as { _tag: string })._tag === "WebSocketSerializationError")
            }

            const receive = <R = unknown>(): Stream.Stream<R, WebSocketError | WebSocketSerializationError> =>
                Stream.merge(
                    Stream.fromQueue(receiveQueue) as Stream.Stream<R, never, never>,
                    Stream.fromQueue(errorQueue).pipe(
                        Stream.filter(isWebSocketErrorType),
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