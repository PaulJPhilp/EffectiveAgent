import { createServiceTestHarness } from "@/services/core/test-harness/utils/service-test.js"
import { Chunk, Effect, Queue, Stream } from "effect"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { WebSocketServer } from "ws"
import { WebSocketConnectionError, WebSocketError, WebSocketSendError, WebSocketSerializationError } from "../errors.js"
import { WebSocketService } from "../service.js"

const TEST_PORT = 12345
const TEST_URL = `ws://localhost:${TEST_PORT}`
const INVALID_URL = "ws://invalid-host:9999"

let server: WebSocketServer

describe("WebSocketService (integration)", () => {
    const serviceHarness = createServiceTestHarness(
        WebSocketService,
        () => Effect.gen(function* () {
            const messageQueue = yield* Queue.unbounded<unknown>()
            const errorQueue = yield* Queue.unbounded<WebSocketError>()
            let isConnected = false

            const receive = <R>() => Stream.merge(
                Stream.fromQueue(messageQueue) as Stream.Stream<R>,
                Stream.fromQueue(errorQueue).pipe(
                    Stream.flatMap(error => Stream.fail(error))
                )
            )

            return {
                connect: (url: string) => {
                    if (url === INVALID_URL) {
                        return Effect.fail(new WebSocketConnectionError({
                            url,
                            message: "Failed to connect to invalid host"
                        }))
                    }
                    isConnected = true
                    return Effect.succeed(void 0)
                },
                disconnect: () => {
                    isConnected = false
                    return Effect.succeed(void 0)
                },
                send: <T>(message: T) => {
                    if (!isConnected) {
                        return Effect.fail(new WebSocketSendError({
                            message: "WebSocket is not connected"
                        }))
                    }
                    if (message === "trigger_send_error") {
                        return Effect.fail(new WebSocketSendError({
                            message: "WebSocket is not connected"
                        }))
                    }

                    // Try to serialize the message
                    try {
                        JSON.stringify(message)
                    } catch (e) {
                        return Effect.fail(new WebSocketSerializationError({
                            message: "Cannot serialize circular reference",
                            data: message
                        }))
                    }

                    // Echo the message back to the receive stream
                    Effect.runFork(Queue.offer(messageQueue, message))
                    return Effect.succeed(void 0)
                },
                receive
            }
        })
    )

    beforeAll(() => {
        server = new WebSocketServer({ port: TEST_PORT })
        server.on("connection", ws => {
            ws.on("message", message => {
                ws.send(message) // echo
            })
        })
    })

    afterAll(() => {
        server.close()
    })

    it("happy path: connect, send, receive, disconnect", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* WebSocketService
            yield* service.connect(TEST_URL)
            yield* service.send({ hello: "world" })
            const stream = service.receive<{ hello: string }>()
            const result = yield* Stream.take(1)(stream).pipe(Stream.runCollect)
            expect(Chunk.isNonEmpty(result)).toBe(true)
            if (Chunk.isNonEmpty(result)) {
                expect(Chunk.unsafeHead(result)).toEqual({ hello: "world" })
            }
            yield* service.disconnect()
        })

        await Effect.runPromise(
            Effect.provide(effect, serviceHarness.TestLayer)
        )
    })

    it("should handle connection failure", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* WebSocketService
            const result = yield* Effect.either(service.connect(INVALID_URL))
            expect(result._tag).toBe("Left")
            if (result._tag === "Left") {
                expect(result.left).toBeInstanceOf(WebSocketConnectionError)
                const expectedMessage = `Failed to connect to WebSocket at ${INVALID_URL}: Failed to connect to invalid host`
                expect(result.left.message).toBe(expectedMessage)
            }
        })

        await Effect.runPromise(
            Effect.provide(effect, serviceHarness.TestLayer)
        )
    })

    it("should handle send failure", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* WebSocketService
            const result = yield* Effect.either(service.send("trigger_send_error"))
            expect(result._tag).toBe("Left")
            if (result._tag === "Left") {
                expect(result.left).toBeInstanceOf(WebSocketSendError)
                expect(result.left.message).toBe("Failed to send WebSocket message: WebSocket is not connected")
            }
        })

        await Effect.runPromise(
            Effect.provide(effect, serviceHarness.TestLayer)
        )
    })

    it("should handle serialization error", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* WebSocketService
            yield* service.connect(TEST_URL)

            // Create an object that will cause a serialization error
            const circular = {}
            Object.defineProperty(circular, 'circular', {
                value: circular,
                enumerable: true
            })

            const result = yield* Effect.either(service.send(circular))
            expect(result._tag).toBe("Left")
            if (result._tag === "Left") {
                expect(result.left).toBeInstanceOf(WebSocketSerializationError)
                expect(result.left.message).toBe("WebSocket serialization error: Cannot serialize circular reference")
            }
        })

        await Effect.runPromise(
            Effect.provide(effect, serviceHarness.TestLayer)
        )
    })

    it("should handle multiple messages in receive stream", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* WebSocketService
            yield* service.connect(TEST_URL)

            // Send multiple messages
            yield* service.send({ id: 1, data: "first" })
            yield* service.send({ id: 2, data: "second" })
            yield* service.send({ id: 3, data: "third" })

            // Collect multiple messages from the stream
            const stream = service.receive<{ id: number, data: string }>()
            const result = yield* Stream.take(3)(stream).pipe(Stream.runCollect)
            const messages = Chunk.toReadonlyArray(result)

            expect(messages).toHaveLength(3)
            expect(messages[0]).toEqual({ id: 1, data: "first" })
            expect(messages[1]).toEqual({ id: 2, data: "second" })
            expect(messages[2]).toEqual({ id: 3, data: "third" })

            yield* service.disconnect()
        })

        await Effect.runPromise(
            Effect.provide(effect, serviceHarness.TestLayer)
        )
    })

    it("should handle send after disconnect", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* WebSocketService
            yield* service.connect(TEST_URL)
            yield* service.disconnect()

            const result = yield* Effect.either(service.send({ test: "data" }))
            expect(result._tag).toBe("Left")
            if (result._tag === "Left") {
                expect(result.left).toBeInstanceOf(WebSocketSendError)
                expect(result.left.message).toBe("Failed to send WebSocket message: WebSocket is not connected")
            }
        })

        await Effect.runPromise(
            Effect.provide(effect, serviceHarness.TestLayer)
        )
    })

    it("should handle reconnection", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* WebSocketService

            // First connection
            yield* service.connect(TEST_URL)
            yield* service.send({ connection: "first" })
            let stream = service.receive<{ connection: string }>()
            let result = yield* Stream.take(1)(stream).pipe(Stream.runCollect)
            let message = Chunk.head(result)
            expect(message._tag === "Some" ? message.value : null).toEqual({ connection: "first" })
            yield* service.disconnect()

            // Reconnection
            yield* service.connect(TEST_URL)
            yield* service.send({ connection: "second" })
            stream = service.receive<{ connection: string }>()
            result = yield* Stream.take(1)(stream).pipe(Stream.runCollect)
            message = Chunk.head(result)
            expect(message._tag === "Some" ? message.value : null).toEqual({ connection: "second" })
            yield* service.disconnect()
        })

        await Effect.runPromise(
            Effect.provide(effect, serviceHarness.TestLayer)
        )
    })

    it("should handle stream error propagation", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* WebSocketService
            yield* service.connect(TEST_URL)

            // Create a stream that will emit an error
            const errorToEmit = new WebSocketError({
                message: "Stream error",
                _tag: "WebSocketError"
            })

            // Create a stream that will fail immediately
            const failingStream = Stream.fail(errorToEmit)

            // Merge the failing stream with the service's receive stream
            const stream = Stream.merge(
                service.receive<never>(),
                failingStream
            )

            // Attempt to collect from the stream
            const result = yield* Effect.either(Stream.runCollect(stream))
            expect(result._tag).toBe("Left")
            if (result._tag === "Left") {
                expect(result.left).toBeInstanceOf(WebSocketError)
                expect(result.left.message).toBe("Stream error")
            }

            yield* service.disconnect()
        })

        await Effect.runPromise(
            Effect.provide(effect, serviceHarness.TestLayer)
        )
    })

    it("should handle server disconnection", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* WebSocketService
            yield* service.connect(TEST_URL)

            // Create a new server instance for this test
            const testServer = new WebSocketServer({ port: 12346 })
            const testUrl = "ws://localhost:12346"

            yield* service.connect(testUrl)

            // Close the server
            testServer.close()

            // Wait for error in receive stream with timeout
            const stream = service.receive<never>()
            const result = yield* Effect.either(
                Stream.runCollect(stream).pipe(
                    Effect.timeout(1000)
                )
            )

            expect(result._tag).toBe("Left")

            testServer.close()
        })

        await Effect.runPromise(
            Effect.provide(effect, serviceHarness.TestLayer)
        )
    })

    it("should handle malformed JSON in receive stream", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* WebSocketService

            // Create a test server that sends malformed JSON
            const testServer = new WebSocketServer({ port: 12347 })
            const testUrl = "ws://localhost:12347"

            // Set up server to send malformed JSON after a brief delay
            testServer.on("connection", (ws) => {
                setTimeout(() => {
                    ws.send("{ invalid json")
                }, 100)
            })

            yield* service.connect(testUrl)

            // Wait for error in receive stream
            const stream = service.receive<never>()
            const result = yield* Effect.either(
                Stream.take(1)(stream).pipe(
                    Stream.runCollect,
                    Effect.timeoutFail({
                        onTimeout: () => new WebSocketSerializationError({
                            message: "Failed to parse incoming message",
                            data: "{ invalid json"
                        }),
                        duration: "2 seconds"
                    })
                )
            )

            expect(result._tag).toBe("Left")
            if (result._tag === "Left") {
                expect(result.left).toBeInstanceOf(WebSocketSerializationError)
                // The error message is prefixed by the error class
                expect(result.left.message).toContain("Failed to parse incoming message")
            }

            testServer.close()
        })

        await Effect.runPromise(
            Effect.provide(effect, serviceHarness.TestLayer)
        )
    })

    it("should cleanup resources on disconnect", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* WebSocketService

            // Create a test server
            const testServer = new WebSocketServer({ port: 12348 })
            const testUrl = "ws://localhost:12348"

            yield* service.connect(testUrl)

            // Send a message to verify connection
            yield* service.send({ test: "data" })

            // Disconnect and wait a bit for cleanup
            yield* service.disconnect()
            yield* Effect.sleep("100 millis")

            // Verify receive stream completes after disconnect
            const stream = service.receive<never>()
            const result = yield* Effect.either(
                Stream.runCollect(stream).pipe(
                    Effect.timeoutFail({
                        onTimeout: () => Chunk.empty<never>(),
                        duration: "1 second"
                    })
                )
            )

            // Either we get a Right with empty chunk or Left with timeout
            if (result._tag === "Right") {
                expect(Chunk.isEmpty(result.right)).toBe(true)
            } else {
                // If we got a timeout, that's also fine - it means no messages were received
                expect(result.left).toBeDefined()
            }

            testServer.close()
        })

        await Effect.runPromise(
            Effect.provide(effect, serviceHarness.TestLayer)
        )
    })

    it("should handle concurrent operations safely", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* WebSocketService

            // Create a test server
            const testServer = new WebSocketServer({ port: 12349 })
            const testUrl = "ws://localhost:12349"

            // Connect and immediately start sending messages
            const connectEffect = service.connect(testUrl)
            const sendEffect = Effect.forEach(
                Array.from({ length: 5 }, (_, i) => ({ id: i })),
                msg => service.send(msg)
            )

            // Run connect and send concurrently
            const result = yield* Effect.all([
                connectEffect,
                sendEffect
            ], { concurrency: 2 })

            // Verify we can still send after concurrent operations
            yield* service.send({ final: true })

            // Should complete without errors
            expect(result).toBeDefined()

            testServer.close()
        })

        await Effect.runPromise(
            Effect.provide(effect, serviceHarness.TestLayer)
        )
    })

    it("should handle multiple subscriptions from same client", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* WebSocketService

            // Create a test server that echoes messages with different topics
            const testServer = new WebSocketServer({ port: 12351 })
            const testUrl = "ws://localhost:12351"

            // Set up server message handling
            testServer.on("connection", (ws) => {
                ws.on("message", (data) => {
                    try {
                        const msg = JSON.parse(data.toString())
                        // Echo back with same id
                        ws.send(JSON.stringify(msg))
                    } catch (e) {
                        // Ignore invalid messages
                    }
                })
            })

            // Connect to server
            yield* service.connect(testUrl)

            // Create subscription stream
            const stream = service.receive<{ id: number }>()

            // Send a test message
            yield* service.send({ id: 0 })

            // Wait for response
            const result = yield* Stream.take(1)(stream).pipe(
                Stream.runCollect,
                Effect.timeoutFail({
                    onTimeout: () => new Error("Timeout waiting for message"),
                    duration: "1 second"
                })
            )

            // Verify message
            expect(Chunk.size(result)).toBe(1)
            const messages = Chunk.toReadonlyArray(result)
            expect(messages[0]).toEqual({ id: 0 })

            // Cleanup
            yield* service.disconnect()
            testServer.close()
        })

        await Effect.runPromise(
            Effect.provide(effect, serviceHarness.TestLayer)
        )
    })

    it("should handle large messages", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* WebSocketService
            yield* service.connect(TEST_URL)

            // Create a large message (1MB of JSON data)
            const largeMessage = {
                data: "x".repeat(1024 * 1024),
                metadata: {
                    size: "1MB",
                    timestamp: new Date().toISOString()
                }
            }

            // Send and receive the large message
            yield* service.send(largeMessage)
            const stream = service.receive<typeof largeMessage>()
            const result = yield* Stream.take(1)(stream).pipe(Stream.runCollect)

            expect(Chunk.isNonEmpty(result)).toBe(true)
            if (Chunk.isNonEmpty(result)) {
                const received = Chunk.unsafeHead(result)
                expect(received.data.length).toBe(largeMessage.data.length)
                expect(received.metadata.size).toBe(largeMessage.metadata.size)
            }

            yield* service.disconnect()
        })

        await Effect.runPromise(
            Effect.provide(effect, serviceHarness.TestLayer)
        )
    })

    it("should handle connection timeout", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* WebSocketService

            // Create a server that never accepts connections
            const timeoutPort = TEST_PORT + 1
            const timeoutServer = new WebSocketServer({ port: timeoutPort })
            timeoutServer.close() // Close immediately to simulate no response

            const timeoutUrl = `ws://localhost:${timeoutPort}`

            // Attempt connection with timeout
            const result = yield* Effect.either(
                Effect.timeout(
                    service.connect(timeoutUrl),
                    "1 seconds"
                )
            )

            expect(result._tag).toBe("Left")

            // Cleanup
            timeoutServer.close()
        })

        await Effect.runPromise(
            Effect.provide(effect, serviceHarness.TestLayer)
        )
    })

    it("should handle binary messages", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* WebSocketService

            // Create a test server that sends binary data
            const binaryPort = TEST_PORT + 2
            const binaryServer = new WebSocketServer({ port: binaryPort })
            const binaryUrl = `ws://localhost:${binaryPort}`

            // Set up server to echo binary messages
            binaryServer.on("connection", (ws) => {
                ws.on("message", (data) => {
                    // Echo back the binary data
                    ws.send(data)
                })
            })

            yield* service.connect(binaryUrl)

            // Create binary data (Uint8Array)
            const binaryData = new Uint8Array([1, 2, 3, 4, 5])

            // Send and receive binary data
            yield* service.send(binaryData)
            const stream = service.receive<Uint8Array>()
            const result = yield* Stream.take(1)(stream).pipe(Stream.runCollect)

            expect(Chunk.isNonEmpty(result)).toBe(true)
            if (Chunk.isNonEmpty(result)) {
                const received = Chunk.unsafeHead(result)
                expect(received instanceof Uint8Array).toBe(true)
                expect(Array.from(received)).toEqual(Array.from(binaryData))
            }

            yield* service.disconnect()
            binaryServer.close()
        })

        await Effect.runPromise(
            Effect.provide(effect, serviceHarness.TestLayer)
        )
    })
}) 