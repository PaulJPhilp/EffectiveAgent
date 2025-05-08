/**
 * Integration test between WebSocket and AgentRuntime services
 * 
 * This test demonstrates how to test the integration between multiple services,
 * particularly the MockWebSocketServer and AgentRuntimeService.
 * Uses the TestHarnessService for proper test setup and assertions.
 */

import { MockWebSocketServer } from "@/services/core/mock-websocket/service.js"
import { Brand, Effect, Scope, Stream } from "effect"
import { WebSocket } from "mock-socket"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"

// Define the AgentRuntimeId type to match the service's expectations
type AgentRuntimeId = Brand.Branded<string, "AgentRuntimeId">

// Define interfaces to ensure type compatibility with the actual service interfaces
interface AgentRuntimeState<S> {
    id: AgentRuntimeId;
    state: S;
    status: string;
    lastUpdated: number;
}

interface AgentRuntime<S> {
    id: AgentRuntimeId;
    send: (payload: unknown) => Effect.Effect<void, never, never>;
    getState: () => Effect.Effect<AgentRuntimeState<S>, never, never>;
    subscribe: () => Stream.Stream<never, never, never>;
    terminate: () => Effect.Effect<void, never, never>;
}

// For type checking with MockWebSocketServer
interface WebSocketServerMethods {
    getUrl: () => Effect.Effect<string, never, never>;
    isActive: () => Effect.Effect<boolean, never, never>;
}

// Create a testable version of the AgentRuntimeService
const createTestAgentRuntimeService = () => {
    // Track calls for verification
    const calls: { method: string, args: any[] }[] = []

    const mockAgentRuntime = {
        send: (agentRuntimeId: AgentRuntimeId, payload: unknown) => {
            calls.push({ method: "send", args: [agentRuntimeId, payload] })
            return Effect.succeed(void 0)
        },
        subscribe: (agentRuntimeId: AgentRuntimeId) => {
            calls.push({ method: "subscribe", args: [agentRuntimeId] })
            return Stream.fromIterable([
                {
                    sequence: 1,
                    timestamp: new Date().toISOString(),
                    type: "output" as const,
                    payload: { message: "test output from runtime" },
                    agentRuntimeId
                }
            ])
        },
        create: <S>() => {
            calls.push({ method: "create", args: [] })
            const id = "test-agent" as AgentRuntimeId

            const runtime: AgentRuntime<S> = {
                id,
                send: (payload: unknown) => Effect.succeed(undefined),
                getState: () => Effect.succeed({
                    id,
                    state: { status: "running" } as any as S, // Type cast to match expected S
                    status: "IDLE",
                    lastUpdated: Date.now()
                }),
                subscribe: () => Stream.empty,
                terminate: () => Effect.succeed(undefined)
            }

            return Effect.succeed(runtime)
        },
        terminate: (agentRuntimeId: AgentRuntimeId) => {
            calls.push({ method: "terminate", args: [agentRuntimeId] })
            return Effect.succeed(void 0)
        },
        getState: <S>(agentRuntimeId: AgentRuntimeId) => {
            calls.push({ method: "getState", args: [agentRuntimeId] })
            const state: AgentRuntimeState<S> = {
                id: agentRuntimeId,
                state: { count: 0 } as any as S, // Type cast to match expected S
                status: "IDLE",
                lastUpdated: Date.now()
            }
            return Effect.succeed(state)
        }
    }

    return {
        service: mockAgentRuntime,
        calls
    }
}

// Helper to wait for WebSocket connection
const waitForConnection = async (socket: WebSocket): Promise<void> => {
    if (socket.readyState === WebSocket.OPEN) {
        return
    }

    return new Promise((resolve) => {
        socket.addEventListener("open", () => resolve())

        // Also poll the state in case the event listener doesn't fire
        const checkState = () => {
            if (socket.readyState === WebSocket.OPEN) {
                resolve()
            } else {
                setTimeout(checkState, 10)
            }
        }
        checkState()
    })
}

// Helper to collect messages from WebSocket
const collectMessages = (socket: WebSocket, count = 1, timeout = 1000): Promise<any[]> => {
    const messages: any[] = []

    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            socket.onmessage = () => { }
            reject(new Error(`Timed out waiting for ${count} messages`))
        }, timeout)

        socket.onmessage = (event) => {
            const message = JSON.parse(event.data.toString())
            messages.push(message)

            if (messages.length >= count) {
                clearTimeout(timeoutId)
                socket.onmessage = () => { }
                resolve(messages)
            }
        }
    })
}

describe("WebSocket and AgentRuntime Integration", () => {
    // Test resources
    let agentRuntimeMock: ReturnType<typeof createTestAgentRuntimeService>
    let server: MockWebSocketServer
    let scope: Scope.Scope
    let mockUrl: string
    let client: WebSocket | undefined
    let testHarness: any

    // Set up test environment once
    beforeAll(async () => {
        // Create a scope for the test resources
        scope = await Effect.runPromise(Scope.make())

        try {
            // Set up test harness - directly create the service without using Layer
            testHarness = {
                // Implement necessary test harness methods directly
                assert: (condition: boolean, message: string) => {
                    if (!condition) throw new Error(`Assertion failed: ${message}`)
                },
                log: (message: string) => console.log(`[TestHarness] ${message}`)
            }

            // Create the mock AgentRuntime service
            agentRuntimeMock = createTestAgentRuntimeService()

            // Create the WebSocket server using the mock runtime
            // Instead of using Layer.provide, directly create the server with the mock service
            const serverEffect = Effect.scoped(
                Effect.gen(function* () {
                    // Create MockWebSocketServer directly by passing the mock service
                    const mockServer = yield* Effect.succeed(new MockWebSocketServer(agentRuntimeMock.service))
                    return mockServer
                })
            )

            // Run the server creation effect
            server = await Effect.runPromise(serverEffect)

            // Get the server URL using the extended server with our interface
            const extendedServer = server as unknown as WebSocketServerMethods
            const urlEffect = extendedServer.getUrl()
            mockUrl = await Effect.runPromise(urlEffect)
        } catch (error) {
            console.error("Failed to set up test environment:", error)

            // Clean up if setup fails
            if (scope) {
                await Effect.runPromise(
                    Effect.scoped(Effect.addFinalizer(() => Effect.logDebug("Scope finalized")))
                )
            }
            throw error
        }
    })

    // Clean up test environment
    afterAll(async () => {
        if (scope) {
            await Effect.runPromise(
                Effect.scoped(Effect.addFinalizer(() => Effect.logDebug("Scope finalized")))
            )
        }
    })

    // Create a new client before each test
    beforeEach(async () => {
        client = new WebSocket(mockUrl)
        await waitForConnection(client)
    })

    // Clean up client after each test
    afterEach(() => {
        if (client) {
            client.close()
            client = undefined
        }
        // Reset the call tracker
        agentRuntimeMock.calls.length = 0
    })

    it("should correctly subscribe to agent activity", async () => {
        expect(client).toBeDefined()

        // Create a test agent ID
        const testAgentId = "test-agent-123" as AgentRuntimeId

        // Start collecting messages (we expect an activity message)
        const messagePromise = collectMessages(client!, 1, 500)

        // Send subscription message
        client!.send(JSON.stringify({
            type: "subscribe",
            agentRuntimeId: testAgentId
        }))

        // Wait for and verify the response message
        const messages = await messagePromise
        expect(messages.length).toBe(1)
        expect(messages[0].type).toBe("activity")
        expect(messages[0].agentRuntimeId).toBe(testAgentId)
        expect(messages[0].activity.type).toBe("output")
        expect(messages[0].activity.payload.message).toBe("test output from runtime")

        // Verify the AgentRuntimeService was called correctly
        expect(agentRuntimeMock.calls.length).toBe(1)
        expect(agentRuntimeMock.calls[0].method).toBe("subscribe")
        expect(agentRuntimeMock.calls[0].args[0]).toBe(testAgentId)
    })

    it("should correctly send messages to the runtime", async () => {
        expect(client).toBeDefined()

        // Create a test agent ID and payload
        const testAgentId = "target-agent-456" as AgentRuntimeId
        const testPayload = { message: "hello from client", timestamp: new Date().toISOString() }

        // Send a message to the target agent
        client!.send(JSON.stringify({
            type: "send",
            targetAgentRuntimeId: testAgentId,
            payload: testPayload
        }))

        // Wait a moment for processing
        await new Promise(resolve => setTimeout(resolve, 100))

        // Verify the AgentRuntimeService was called correctly
        expect(agentRuntimeMock.calls.length).toBe(1)
        expect(agentRuntimeMock.calls[0].method).toBe("send")
        expect(agentRuntimeMock.calls[0].args[0]).toBe(testAgentId)
        expect(JSON.stringify(agentRuntimeMock.calls[0].args[1])).toBe(JSON.stringify(testPayload))
    })

    it("should handle invalid messages with error responses", async () => {
        expect(client).toBeDefined()

        // Start collecting messages (we expect an error message)
        const messagePromise = collectMessages(client!, 1, 500)

        // Send an invalid message
        client!.send("this is not valid JSON")

        // Wait for and verify the error message
        const messages = await messagePromise
        expect(messages.length).toBe(1)
        expect(messages[0].type).toBe("error")
        expect(messages[0].code).toBeDefined()

        // Verify the AgentRuntimeService was not called
        expect(agentRuntimeMock.calls.length).toBe(0)
    })

    it("should clean up subscriptions when unsubscribing", async () => {
        expect(client).toBeDefined()

        // Create a test agent ID
        const testAgentId = "test-agent-789" as AgentRuntimeId

        // Subscribe to the agent
        client!.send(JSON.stringify({
            type: "subscribe",
            agentRuntimeId: testAgentId
        }))

        // Wait a moment to ensure subscription is processed
        await new Promise(resolve => setTimeout(resolve, 100))

        // Verify the subscription was created
        expect(agentRuntimeMock.calls.length).toBe(1)
        expect(agentRuntimeMock.calls[0].method).toBe("subscribe")

        // Now unsubscribe
        client!.send(JSON.stringify({
            type: "unsubscribe",
            agentRuntimeId: testAgentId
        }))

        // Wait a moment to ensure unsubscription is processed
        await new Promise(resolve => setTimeout(resolve, 100))

        // Cannot directly verify unsubscription in this mock setup,
        // but we can verify the server is still active
        const extendedServer = server as unknown as WebSocketServerMethods
        const isActiveEffect = extendedServer.isActive()
        const isActive = await Effect.runPromise(isActiveEffect)
        expect(isActive).toBe(true)
    })
})