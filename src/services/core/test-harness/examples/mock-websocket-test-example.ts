/**
 * Example demonstrating how to use the TestHarnessService with MockWebSocketServer.
 * 
 * This example shows the recommended patterns for testing components that interact
 * with the WebSocket server, leveraging the test harness utilities.
 */

import { AgentRuntimeService } from "@/agent-runtime/agent-runtime.service.js"
import { MockWebSocketServer } from "@/services/core/mock-websocket/service.js"
import { TestHarnessLayer, TestHarnessService } from "@/services/core/test-harness/service.js"
import { Brand, Effect, Layer, Scope, Stream } from "effect"
import { WebSocket } from "mock-socket"

/**
 * Type definition for AgentRuntimeId for type safety
 */
type AgentRuntimeId = Brand.Branded<string, "AgentRuntimeId">

/**
 * Example of an activity message from an agent
 */
interface AgentActivity {
    sequence: number
    timestamp: string
    type: "output" | "error" | "status"
    payload: unknown
    agentRuntimeId: AgentRuntimeId
}

/**
 * Step 1: Create a mock AgentRuntimeService for testing
 * This is a common pattern when testing components that depend on the AgentRuntimeService
 */
function createMockAgentRuntimeService() {
    // Track calls for verification in tests
    const calls: { method: string, args: unknown[] }[] = []

    const mockAgentRuntime = {
        send: (agentRuntimeId: AgentRuntimeId, payload: unknown) => {
            calls.push({ method: "send", args: [agentRuntimeId, payload] })
            return Effect.succeed(void 0)
        },
        subscribe: (agentRuntimeId: AgentRuntimeId) => {
            calls.push({ method: "subscribe", args: [agentRuntimeId] })
            // Return a Stream of mock activities
            return Stream.fromIterable([
                {
                    sequence: 1,
                    timestamp: new Date().toISOString(),
                    type: "output" as const,
                    payload: { message: "Mock activity from agent" },
                    agentRuntimeId
                }
            ])
        }
    }

    return {
        service: mockAgentRuntime,
        calls,
        layer: Layer.succeed(AgentRuntimeService, mockAgentRuntime)
    }
}

/**
 * Step 2: Create WebSocket helpers for testing
 * These helpers make it easier to work with WebSockets in tests
 */

// Helper to wait for WebSocket connection
const waitForConnection = async (socket: WebSocket): Promise<void> => {
    if (socket.readyState === WebSocket.OPEN) {
        return
    }

    return new Promise((resolve) => {
        socket.addEventListener("open", () => resolve())

        // Also poll the state in case event listener doesn't fire
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

/**
 * Step 3: Create a test suite function that demonstrates how to use the test harness
 */
export async function runMockWebSocketExample() {
    console.log("=== MockWebSocketServer Test Example ===")

    // Test resources
    let agentRuntimeMock: ReturnType<typeof createMockAgentRuntimeService>
    let server: MockWebSocketServer
    let scope: Scope.Scope
    let mockUrl: string
    let client: WebSocket | undefined
    let testHarness: TestHarnessService.Type

    console.log("1. Creating test resources...")

    try {
        // Create a scope for test resources
        scope = await Effect.runPromise(Scope.make())

        // Setup test harness
        testHarness = await Effect.runPromise(
            Effect.provide(
                TestHarnessService,
                TestHarnessLayer
            )
        )

        // Create the mock AgentRuntime service
        agentRuntimeMock = createMockAgentRuntimeService()

        // Create the WebSocket server using the mock runtime
        const serverEffect = Effect.provide(
            MockWebSocketServer.effect,
            agentRuntimeMock.layer
        )

        // Use the test harness's effect runners to run the server setup
        console.log("2. Starting MockWebSocketServer...")
        server = await testHarness.runners.runPromise(Effect.scoped(serverEffect))

        // Get the server URL
        mockUrl = await testHarness.runners.runPromise(server.getUrl())
        console.log(`   Server started at ${mockUrl}`)

        // Create a WebSocket client
        console.log("3. Connecting WebSocket client...")
        client = new WebSocket(mockUrl)
        await waitForConnection(client)
        console.log("   Client connected")

        // Run test scenarios
        await testSubscription(client, testHarness)
        await testSendMessage(client, agentRuntimeMock, testHarness)
        await testInvalidMessage(client, testHarness)

        console.log("6. Tests completed successfully")
    } catch (error) {
        console.error("Error running example:", error)
    } finally {
        // Clean up resources
        console.log("7. Cleaning up resources...")
        if (client) {
            client.close()
        }

        if (scope) {
            await Effect.runPromise(Scope.close(scope, Effect.unit))
        }
        console.log("   Resources cleaned up")
    }

    console.log("=== Example Complete ===")
}

/**
 * Example test scenario: Subscribe to agent activity
 */
async function testSubscription(client: WebSocket, testHarness: TestHarnessService.Type) {
    console.log("4. Testing agent subscription...")

    // Start collecting messages
    const messagePromise = collectMessages(client, 1, 500)

    // Create a test agent ID
    const testAgentId = "test-agent-123" as AgentRuntimeId

    // Send subscription message
    client.send(JSON.stringify({
        type: "subscribe",
        agentRuntimeId: testAgentId
    }))

    // Wait for response message
    const messages = await messagePromise

    // Verify using test harness assertions
    testHarness.assertions.assertThat(messages.length === 1, "Should receive exactly one message")
    testHarness.assertions.assertThat(messages[0].type === "activity", "Message type should be 'activity'")
    testHarness.assertions.assertThat(messages[0].agentRuntimeId === testAgentId, "Agent runtime ID should match")

    console.log("   ✓ Subscription test passed")
}

/**
 * Example test scenario: Send message to an agent
 */
async function testSendMessage(
    client: WebSocket,
    agentRuntimeMock: ReturnType<typeof createMockAgentRuntimeService>,
    testHarness: TestHarnessService.Type
) {
    console.log("5. Testing sending message to agent...")

    // Create a test agent ID and payload
    const testAgentId = "target-agent-456" as AgentRuntimeId
    const testPayload = { message: "hello from client", timestamp: new Date().toISOString() }

    // Reset call tracker
    agentRuntimeMock.calls.length = 0

    // Send a message to the target agent
    client.send(JSON.stringify({
        type: "send",
        targetAgentRuntimeId: testAgentId,
        payload: testPayload
    }))

    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 100))

    // Verify using test harness assertions
    testHarness.assertions.assertThat(agentRuntimeMock.calls.length === 1, "Should have one service call")
    testHarness.assertions.assertThat(agentRuntimeMock.calls[0].method === "send", "Method should be 'send'")
    testHarness.assertions.assertThat(agentRuntimeMock.calls[0].args[0] === testAgentId, "Agent ID should match")

    console.log("   ✓ Send message test passed")
}

/**
 * Example test scenario: Send invalid message
 */
async function testInvalidMessage(client: WebSocket, testHarness: TestHarnessService.Type) {
    console.log("6. Testing invalid message handling...")

    // Start collecting messages
    const messagePromise = collectMessages(client, 1, 500)

    // Send invalid JSON message
    client.send("this is not valid JSON")

    // Wait for response message
    const messages = await messagePromise

    // Verify using test harness assertions
    testHarness.assertions.assertThat(messages.length === 1, "Should receive exactly one message")
    testHarness.assertions.assertThat(messages[0].type === "error", "Message type should be 'error'")
    testHarness.assertions.assertThat(messages[0].code !== undefined, "Error should have a code")

    console.log("   ✓ Invalid message test passed")
}

// You can run this example directly:
// runMockWebSocketExample().catch(console.error)