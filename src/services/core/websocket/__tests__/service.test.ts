import { createServiceTestHarness } from "@/services/core/test-utils/effect-test-harness.js"
import { Effect, Layer, Scope, Stream } from "effect"
import { Server } from "mock-socket"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { WebSocketService } from "../service.js"

describe("WebSocketService", () => {
    const mockUrl = "ws://localhost:12345/test"
    let mockServer: Server
    let harness = createServiceTestHarness(Layer.provide(Layer.succeed(Scope.Scope), WebSocketService.Default))

    beforeEach(() => {
        mockServer = new Server(mockUrl)
        harness = createServiceTestHarness(Layer.provide(Layer.succeed(Scope.Scope), WebSocketService.Default))
    })

    afterEach(async () => {
        mockServer.close()
        // Ensure we disconnect any existing connections
        const program = Effect.gen(function* () {
            const service = yield* WebSocketService
            yield* service.disconnect()
        })
        await harness.runTest(program)
    })

    describe("connect", () => {
        it("should successfully connect to a WebSocket server", async () => {
            const program = Effect.gen(function* () {
                const service = yield* WebSocketService
                yield* service.connect(mockUrl)
                // Add a small delay to ensure connection is established
                yield* Effect.sleep("100 millis")
                const isConnected = mockServer.clients().length === 1
                expect(isConnected).toBe(true)
            })

            await harness.runTest(program)
        })

        it("should fail with WebSocketConnectionError on connection failure", async () => {
            mockServer.close() // Close server to force connection failure
            const program = Effect.gen(function* () {
                const service = yield* WebSocketService
                yield* service.connect(mockUrl)
            })

            await harness.expectError(program, "WebSocketConnectionError")
        })

        it("should reuse existing connection if already connected to same URL", async () => {
            const program = Effect.gen(function* () {
                const service = yield* WebSocketService
                yield* service.connect(mockUrl)
                yield* Effect.sleep("100 millis")
                yield* service.connect(mockUrl)
                yield* Effect.sleep("100 millis")
                const isConnected = mockServer.clients().length === 1
                expect(isConnected).toBe(true)
            })

            await harness.runTest(program)
        })
    })

    describe("disconnect", () => {
        it("should successfully disconnect from server", async () => {
            const program = Effect.gen(function* () {
                const service = yield* WebSocketService
                yield* service.connect(mockUrl)
                yield* Effect.sleep("100 millis")
                yield* service.disconnect()
                const isDisconnected = mockServer.clients().length === 0
                expect(isDisconnected).toBe(true)
            })

            await harness.runTest(program)
        })

        it("should be safe to call disconnect multiple times", async () => {
            const program = Effect.gen(function* () {
                const service = yield* WebSocketService
                yield* service.disconnect()
                yield* service.disconnect()
            })

            await harness.runTest(program)
        })
    })

    describe("send", () => {
        it("should successfully send a message", async () => {
            const message = { type: "test", data: "Hello" }
            const program = Effect.gen(function* () {
                const service = yield* WebSocketService
                yield* service.connect(mockUrl)
                yield* Effect.sleep("100 millis")
                yield* service.send(message)
            })

            await harness.runTest(program)
        })

        it("should fail with WebSocketSendError when not connected", async () => {
            const message = { type: "test", data: "Hello" }
            const program = Effect.gen(function* () {
                const service = yield* WebSocketService
                yield* service.send(message)
            })

            await harness.expectError(program, "WebSocketSendError")
        })
    })

    describe("receive", () => {
        it("should handle deserialization errors", async () => {
            const program = Effect.gen(function* () {
                const service = yield* WebSocketService
                yield* service.connect(mockUrl)
                yield* Effect.sleep("100 millis")

                const client = mockServer.clients()[0]
                client.send("invalid json")

                const stream = service.receive()
                const result = yield* Stream.runCollect(stream)
                expect(result.length).toBe(1)
                expect(result[0]._tag).toBe("WebSocketSerializationError")
            })

            await harness.runTest(program)
        })

        it("should handle connection close", async () => {
            const program = Effect.gen(function* () {
                const service = yield* WebSocketService
                yield* service.connect(mockUrl)
                yield* Effect.sleep("100 millis")

                mockServer.close()

                const stream = service.receive()
                const result = yield* Stream.runCollect(stream)
                expect(result.length).toBe(1)
                expect(result[0]._tag).toBe("WebSocketError")
            })

            await harness.runTest(program)
        })
    })
}) 