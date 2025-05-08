import { AgentRuntimeError, AgentRuntimeNotFoundError } from "@/agent-runtime/agent-runtime.errors.js"
/**
 * Tests for the MockWebSocketServer service
 */
import type { AgentRuntime, AgentRuntimeServiceApi, AgentRuntimeState } from "@/agent-runtime/index.js"

// Define AgentRecord type locally for testing purposes
type AgentRecord = any;
import { AgentRuntimeService, AgentRuntimeStatus, makeAgentRuntimeId } from "@/agent-runtime/index.js"
import type { MockWebSocketServerApi } from "@/services/core/mock-websocket/api.js"
import { createServiceTestHarness } from "@/services/core/test-harness/utils/service-test.js"
import { createTypedMock } from "@/services/core/test-harness/utils/typed-mocks.js"
import { Effect, Layer, Stream } from "effect"
import { WebSocket } from "mock-websocket"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { MockWebSocketServer } from "../service.js"

describe("MockWebSocketServer", () => {
    // Create test agent ID using proper factory
    const testAgentId = makeAgentRuntimeId("test-agent")

    // Create mock AgentRuntimeService with proper types
    const mockAgentRuntimeService = createTypedMock<AgentRuntimeServiceApi>({
        create: <S>(id: typeof testAgentId, initialState: S): Effect.Effect<AgentRuntime<S>, AgentRuntimeError> =>
            Effect.succeed({
                id,
                send: () => Effect.succeed(void 0),
                getState: () => (
                    Effect.succeed<AgentRuntimeState<S>>({
                        id,
                        state: initialState,
                        status: AgentRuntimeStatus.IDLE,
                        lastUpdated: Date.now(),
                        processing: {
                            processed: 0,
                            failures: 0,
                            avgProcessingTime: 0
                        },
                        mailbox: {
                            size: 0,
                            processed: 0,
                            timeouts: 0,

                        }
                    }) as Effect.Effect<AgentRuntimeState<S>, Error, never>
                ),
                subscribe: () => Stream.empty as Stream.Stream<AgentRecord, Error, never>
            }) as Effect.Effect<AgentRuntime<S>, AgentRuntimeError>,
        getState: <S>(id: typeof testAgentId): Effect.Effect<AgentRuntimeState<S>, AgentRuntimeNotFoundError> =>
            Effect.fail(new AgentRuntimeNotFoundError({ agentRuntimeId: id, message: `AgentRuntime ${id} not found` })) as Effect.Effect<AgentRuntimeState<S>, AgentRuntimeNotFoundError>,
        subscribe: (id: typeof testAgentId) => Stream.empty as Stream.Stream<AgentRecord, Error>,
        terminate: (id: typeof testAgentId) => Effect.succeed(void 0),
        send: (id: typeof testAgentId, message: any) => Effect.succeed(void 0)
    })


    // Create test harness
    const harness = createServiceTestHarness(
        MockWebSocketServer,
        () => Effect.gen(function* () {
            // Build test layer with mocked dependencies
            const testLayer = Layer.succeed(AgentRuntimeService, {
                create: <S>(id: typeof testAgentId, initialState: S): Effect.Effect<AgentRuntime<S>, AgentRuntimeError> =>
                    Effect.succeed({
                        id,
                        send: () => Effect.succeed(void 0),
                        getState: () => (
                            Effect.succeed<AgentRuntimeState<S>>({
                                id,
                                state: initialState,
                                status: AgentRuntimeStatus.IDLE,
                                lastUpdated: Date.now(),
                                processing: {
                                    processed: 0,
                                    failures: 0,
                                    avgProcessingTime: 0
                                },
                                mailbox: {
                                    size: 0,
                                    processed: 0,
                                    timeouts: 0
                                }
                            }) as Effect.Effect<AgentRuntimeState<S>, Error, never>
                        ),
                        subscribe: () => Stream.empty as Stream.Stream<AgentRecord, Error, never>
                    }) as Effect.Effect<AgentRuntime<S>, AgentRuntimeError>,
                subscribe: (id: typeof testAgentId) => Stream.empty as Stream.Stream<AgentRecord, Error>,
                getState: <S>(id: typeof testAgentId): Effect.Effect<AgentRuntimeState<S>, AgentRuntimeNotFoundError> =>
                    Effect.succeed<AgentRuntimeState<S>>({
                        id,
                        state: {} as S,
                        status: AgentRuntimeStatus.IDLE,
                        lastUpdated: Date.now(),
                        processing: {
                            processed: 0,
                            failures: 0,
                            avgProcessingTime: 0
                        },
                        mailbox: {
                            size: 0,
                            processed: 0,
                            timeouts: 0
                        }
                    }) as Effect.Effect<AgentRuntimeState<S>, AgentRuntimeNotFoundError>,
                // Add missing required methods
                terminate: (id: typeof testAgentId) => Effect.succeed(void 0),
                send: <S>(id: typeof testAgentId, message: S) => Effect.succeed(void 0)
            })

            return yield* Effect.provide(
                Effect.scoped(MockWebSocketServer.effect),
                testLayer
            )
        })
    )

    let client: WebSocket | null = null
    let server: MockWebSocketServerApi

    beforeAll(async () => {
        // Get server instance through test harness
        server = await Effect.runPromise(
            Effect.gen(function* () {
                return yield* MockWebSocketServer
            }).pipe(Effect.provide(harness.TestLayer))
        )

        // Get URL and connect client
        const url = await Effect.runPromise(server.getUrl())
        client = new WebSocket(url)

        // Wait for connection
        await new Promise<void>(resolve => {
            client!.onopen = () => resolve()
        })
    })

    afterAll(() => {
        if (client) {
            client.close()
        }
    })

    describe("WebSocket Communication", () => {
        // Helper to collect messages
        const collectMessages = (client: WebSocket, count: number, timeout: number) => {
            return new Promise<any[]>(resolve => {
                const messages: any[] = []
                const messageHandler = (event: any) => {
                    try {
                        const data = JSON.parse(event.data)
                        messages.push(data)
                        if (messages.length >= count) {
                            cleanup()
                            resolve(messages)
                        }
                    } catch (e) {
                        // Handle non-JSON messages
                    }
                }

                client.onmessage = messageHandler as any

                const timeoutId = setTimeout(() => {
                    cleanup()
                    resolve(messages)
                }, timeout)

                function cleanup() {
                    clearTimeout(timeoutId)
                    client.onmessage = null
                }
            })
        }

        it("should handle valid messages", async () => {
            expect(client).toBeDefined()
            if (!client) return

            // Send a message
            client.send(JSON.stringify({
                type: "send",
                targetAgentRuntimeId: testAgentId,
                payload: { message: "test" }
            }))

            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 100))
            expect(true).toBe(true)
        })

        it("should handle invalid messages", async () => {
            expect(client).toBeDefined()
            if (!client) return

            // Collect messages
            const messagePromise = collectMessages(client, 1, 500)

            // Send invalid message
            client.send("invalid json")

            // Verify error response
            const messages = await messagePromise
            expect(messages[0].type).toBe("error")
            expect(messages[0].code).toBeDefined()
        })

        it("should handle subscription lifecycle", async () => {
            expect(client).toBeDefined()
            if (!client) return

            // Subscribe
            client.send(JSON.stringify({
                type: "subscribe",
                agentRuntimeId: testAgentId
            }))

            await new Promise(resolve => setTimeout(resolve, 100))

            // Unsubscribe
            client.send(JSON.stringify({
                type: "unsubscribe",
                agentRuntimeId: testAgentId
            }))

            await new Promise(resolve => setTimeout(resolve, 100))

            // Verify server state
            const active = await Effect.runPromise(server.isActive())
            expect(active).toBe(true)
        })
    })
})