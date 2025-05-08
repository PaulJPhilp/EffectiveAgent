import { createServiceTestHarness } from "@/services/core/test-utils/effect-test-harness.js"
import { Effect, Layer, Stream, pipe } from "effect"
import { Server } from "mock-socket"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { WebSocketService } from "../service.js"

describe("WebSocketService", () => {
    const mockUrl = "ws://localhost:12345/test"
    let mockServer: Server
    let harness = createServiceTestHarness(
        Layer.effect(
            WebSocketService,
            Effect.succeed({
                connect: (_url: string) => Effect.succeed(void 0),
                send: (_data: unknown) => Effect.succeed(void 0),
                receive: () => Stream.empty,
                disconnect: () => Effect.succeed(void 0)
            })
        )
    )

    beforeEach(() => {
        mockServer = new Server(mockUrl)
    })

    afterEach(() => {
        mockServer.close()
    })

    describe("connect", () => {
        it("should successfully connect to a WebSocket server", async () => {
            const program = Effect.gen(function* (_) {
                const service = yield* _(WebSocketService)
                yield* _(service.connect(mockUrl))
                const isConnected = mockServer.clients().length === 1
                expect(isConnected).toBe(true)
            })

            await harness.runTest(program)
        })

        it("should fail with WebSocketConnectionError on connection failure", async () => {
            const program = Effect.gen(function* (_) {
                const service = yield* _(WebSocketService)
                yield* _(service.connect("ws://invalid-url"))
            })

            await harness.expectError(program, "WebSocketConnectionError")
        })

        it("should reuse existing connection if already connected to same URL", async () => {
            const program = Effect.gen(function* (_) {
                const service = yield* _(WebSocketService)
                yield* _(service.connect(mockUrl))
                yield* _(service.connect(mockUrl))
                const isConnected = mockServer.clients().length === 1
                expect(isConnected).toBe(true)
            })

            await harness.runTest(program)
        })
    })

    describe("send", () => {
        it("should successfully send a message", async () => {
            let receivedMessage: unknown = null

            mockServer.on("connection", (socket) => {
                socket.on("message", (data) => {
                    receivedMessage = JSON.parse(data.toString())
                })
            })

            const testMessage = { type: "test", data: "hello" }
            const program = Effect.gen(function* (_) {
                const service = yield* _(WebSocketService)
                yield* _(service.connect(mockUrl))
                yield* _(service.send(testMessage))
            })

            await harness.runTest(program)
            expect(receivedMessage).toEqual(testMessage)
        })

        it("should fail with WebSocketSendError when not connected", async () => {
            const program = Effect.gen(function* (_) {
                const service = yield* _(WebSocketService)
                yield* _(service.send({ type: "test" }))
            })

            await harness.expectError(program, "WebSocketSendError")
        })

        it("should fail with WebSocketSerializationError on non-serializable data", async () => {
            const program = Effect.gen(function* (_) {
                const service = yield* _(WebSocketService)
                yield* _(service.connect(mockUrl))
                const circular = { ref: {} }
                circular.ref = circular
                yield* _(service.send(circular))
            })

            await harness.expectError(program, "WebSocketSerializationError")
        })
    })

    describe("receive", () => {
        it("should receive messages from the server", async () => {
            const testMessage = { type: "test", data: "hello" }
            const receivedMessages: unknown[] = []

            mockServer.on("connection", (socket) => {
                socket.send(JSON.stringify(testMessage))
            })

            const program = Effect.gen(function* (_) {
                const service = yield* _(WebSocketService)
                yield* _(service.connect(mockUrl))

                yield* _(pipe(
                    service.receive(),
                    Stream.take(1),
                    Stream.runForEach(msg => Effect.sync(() => receivedMessages.push(msg)))
                ))
            })

            await harness.runTest(program)
            expect(receivedMessages).toEqual([testMessage])
        })

        it("should handle deserialization errors", async () => {
            mockServer.on("connection", (socket) => {
                socket.send("invalid json")
            })

            const program = Effect.gen(function* (_) {
                const service = yield* _(WebSocketService)
                yield* _(service.connect(mockUrl))

                yield* _(pipe(
                    service.receive(),
                    Stream.take(1),
                    Stream.runForEach(() => Effect.succeed(void 0))
                ))
            })

            await harness.expectError(program, "WebSocketSerializationError")
        })

        it("should handle connection close", async () => {
            const program = Effect.gen(function* (_) {
                const service = yield* _(WebSocketService)
                yield* _(service.connect(mockUrl))

                mockServer.close()

                yield* _(pipe(
                    service.receive(),
                    Stream.take(1),
                    Stream.runForEach(() => Effect.succeed(void 0))
                ))
            })

            await harness.expectError(program, "WebSocketError")
        })
    })

    describe("disconnect", () => {
        it("should successfully disconnect from server", async () => {
            const program = Effect.gen(function* (_) {
                const service = yield* _(WebSocketService)
                yield* _(service.connect(mockUrl))
                yield* _(service.disconnect())
                const isConnected = mockServer.clients().length === 0
                expect(isConnected).toBe(true)
            })

            await harness.runTest(program)
        })

        it("should be safe to call disconnect multiple times", async () => {
            const program = Effect.gen(function* (_) {
                const service = yield* _(WebSocketService)
                yield* _(service.connect(mockUrl))
                yield* _(service.disconnect())
                yield* _(service.disconnect())
                const isConnected = mockServer.clients().length === 0
                expect(isConnected).toBe(true)
            })

            await harness.runTest(program)
        })
    })
}) 