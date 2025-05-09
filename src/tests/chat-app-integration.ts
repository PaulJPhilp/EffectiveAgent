/**
 * Test script for integrating the chat app with MockWebSocketServer
 * 
 * This script sets up a MockWebSocketServer with test tools
 * that the chat app can connect to for integration testing.
 */

import { AgentRuntimeService } from "@/agent-runtime/service.js"
import { AgentActivity, AgentActivityType } from "@/agent-runtime/types.js"
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js"
import { ToolService } from "@/services/ai/tools/service.js"
import { ToolRegistryData, ToolRegistryDataTag } from "@/services/ai/tools/types.js"
import { MockWebSocketServer } from "@/services/core/mock-websocket/service.js"
import { AssertionHelperService } from "@/services/core/test-harness/components/assertion-helpers/service.js"
import EffectRunnerService from "@/services/core/test-harness/components/effect-runners/service.js"
import FixtureService from "@/services/core/test-harness/components/fixtures/service.js"
import MockAccessorService from "@/services/core/test-harness/components/mock-accessors/service.js"
import { TestHarnessLayer, TestHarnessService } from "@/services/core/test-harness/service.js"
import { NodeContext } from "@effect/platform-node.js"
import { Context, Effect, Exit, HashMap, Layer, Schema as S, Scope, Stream } from "effect"

// Input schema for weather tool
export class WeatherInput extends S.Class<WeatherInput>("WeatherInput")({
    location: S.String
}) { }

// Output schema for weather tool
export class WeatherOutput extends S.Class<WeatherOutput>("WeatherOutput")({
    temperature: S.Number,
    conditions: S.String,
    location: S.String
}) { }

// Input schema for time tool
export class TimeInput extends S.Class<TimeInput>("TimeInput")({
    timezone: S.optional(S.String)
}) { }

// Output schema for time tool
export class TimeOutput extends S.Class<TimeOutput>("TimeOutput")({
    time: S.String,
    timezone: S.String
}) { }

/**
 * Creates a test tool that returns weather information.
 * @returns An object containing the tool definition and implementation for weather.
 */
function createWeatherTool() {
    return {
        definition: {
            name: "weather:get",
            description: "Get current weather for a location"
        },
        implementation: {
            _tag: "EffectImplementation" as const,
            inputSchema: WeatherInput,
            outputSchema: WeatherOutput,
            execute: (input: { location: string }) => Effect.succeed({
                temperature: 72,
                conditions: "Sunny",
                location: input.location
            })
        }
    }
}

/**
 * Creates a test tool that returns time information.
 * @returns An object containing the tool definition and implementation for time.
 */
function createTimeTool() {
    return {
        definition: {
            name: "time:get",
            description: "Get current time for a timezone"
        },
        implementation: {
            _tag: "EffectImplementation" as const,
            inputSchema: TimeInput,
            outputSchema: TimeOutput,
            execute: (input: { timezone?: string }) => Effect.succeed({
                time: new Date().toLocaleTimeString(),
                timezone: input.timezone || "UTC"
            })
        }
    }
}

/**
 * Creates a mock agent runtime service with canned responses and test tools.
 * @returns An object containing the mock runtime service, call tracker, and test tool registry layer.
 */
function createMockAgentRuntimeWithTools() {
    // Track calls for testing/debugging
    const calls: { method: string, args: unknown[] }[] = []

    // Set up mock tools
    const weatherTool = createWeatherTool()
    const timeTool = createTimeTool()

    // Create tool registry data with mock tools
    const testTools = HashMap.make(
        ["weather:get", weatherTool] as const,
        ["time:get", timeTool] as const
    )
    const toolRegistryData = new ToolRegistryData({
        tools: testTools,
        toolkits: HashMap.empty()
    })

    // Create a welcome activity that includes available tools
    const createWelcomeActivity = (agentRuntimeId: string): AgentActivity => ({
        id: "welcome-1",
        agentRuntimeId: agentRuntimeId as any,
        timestamp: Date.now(),
        type: AgentActivityType.RESPONSE,
        sequence: 1,
        payload: {
            message: "Welcome to the chat! I can help with:\n- Weather information (try 'weather in New York')\n- Current time (try 'what time is it')",
            availableTools: [
                { name: "weather:get", description: "Get current weather for a location" },
                { name: "time:get", description: "Get current time for a timezone" }
            ]
        },
        metadata: {}
    })

    // Create mock runtime implementation
    const mockRuntime = {
        send: (agentRuntimeId: string, activity: AgentActivity) => {
            console.log(`[MOCK] Message sent to agent ${agentRuntimeId}:`, activity)
            calls.push({ method: "send", args: [agentRuntimeId, activity] })

            // Simulate processing and response - this would be handled by the real agent runtime
            setTimeout(() => {
                if (typeof activity.payload === 'object' && activity.payload && 'text' in activity.payload) {
                    const text = String(activity.payload.text).toLowerCase()

                    // Prepare response based on message content
                    let responsePayload: Record<string, unknown> = { message: "I'm not sure how to help with that." }

                    if (text.includes('weather')) {
                        responsePayload = {
                            message: "I can check the weather for you. What location?",
                            suggestedToolCall: {
                                name: "weather:get",
                                input: { location: text.includes('in') ? text.split('in')[1].trim() : "New York" }
                            }
                        }
                    } else if (text.includes('time')) {
                        responsePayload = {
                            message: "Here's the current time:",
                            suggestedToolCall: {
                                name: "time:get",
                                input: {}
                            }
                        }
                    }

                    // Broadcast the response to subscribers
                    mockRuntime._broadcastActivity({
                        id: `response-${Date.now()}`,
                        agentRuntimeId: agentRuntimeId as any,
                        timestamp: Date.now(),
                        type: AgentActivityType.RESPONSE,
                        sequence: 2,
                        payload: responsePayload,
                        metadata: {}
                    })
                }
            }, 500)

            return Effect.succeed(undefined)
        },

        subscribe: (agentRuntimeId: string) => {
            console.log(`[MOCK] Subscription to agent ${agentRuntimeId}`)
            calls.push({ method: "subscribe", args: [agentRuntimeId] })

            // Create fixed stream with welcome activity
            return Stream.fromIterable([createWelcomeActivity(agentRuntimeId)])
        },

        // Internal helper to simulate agent sending activities to subscribers
        _subscribers: new Map<string, (activity: AgentActivity) => void>(),
        _broadcastActivity: (activity: AgentActivity) => {
            // This would normally happen through the real agent runtime's subscription mechanism
            // For testing, we manually broadcast to mock subscribers
            console.log(`[MOCK] Broadcasting activity:`, activity)
        }
    }

    // Create layers for the test
    const toolRegistryLayer = Layer.succeed(ToolRegistryDataTag, toolRegistryData)

    return {
        service: mockRuntime,
        calls,
        layer: toolRegistryLayer
    }
}

/**
 * Main integration test function for the chat app.
 * Sets up a mock WebSocket server and test harness, then provides connection instructions.
 * Handles resource cleanup and error reporting using Effect combinators.
 *
 * @returns {Promise<void>} Resolves when the test server is stopped or interrupted.
 */
export async function testChatAppIntegration() {
    console.log("=== Chat App Integration Test ===")
    console.log("Setting up mock services for chat app testing...\n")

    // Create test resources
    const scope = await Effect.runPromise(Scope.make())

    // Setup test harness
    const testHarness = await Effect.runPromise(
        Effect.provide(TestHarnessService, TestHarnessLayer).pipe(
            Effect.provide(
                Layer.merge(
                    Layer.merge(
                        EffectRunnerService.Default,
                        AssertionHelperService.Default
                    ),
                    Layer.merge(
                        MockAccessorService.Default,
                        FixtureService.Default
                    )
                )
            )
        )
    )

    const integrationEffect = Effect.tryPromise({
        try: async () => {
            // Create a mock AgentRuntime with test tools
            const mockAgentRuntime = createMockAgentRuntimeWithTools()
            // Create scope layer
            const scopeLayer = Layer.succeed(Scope.Scope, scope)

            // Create test layer with all dependencies
            const testLayer = Layer.mergeAll(
                scopeLayer,
                NodeContext.layer,
                AgentRuntimeService.Default,
                mockAgentRuntime.layer,
                ToolService.Default,
                ToolRegistryService.Default,
                MockWebSocketServer.Default
            )

            // Create runtime with dependencies
            const runtime = await Effect.runPromise(
                Effect.gen(function* () {
                    const { context } = yield* Layer.launch(testLayer)
                    return context
                }).pipe(
                    Effect.provide(Layer.mergeAll(
                        Layer.succeed(Scope.Scope, scope),
                        NodeContext.layer,
                        AgentRuntimeService.Default
                    ))
                )
            )

            // Get server
            const server = await Effect.runPromise(
                Effect.gen(function* () {
                    const server = yield* MockWebSocketServer
                    return server
                }).pipe(
                    Effect.provideService(
                        MockWebSocketServer,
                        Context.unsafeGet(runtime, MockWebSocketServer)
                    ),
                    Effect.scoped
                )
            )

            // Get URL
            const mockUrl = await Effect.runPromise(
                Effect.gen(function* () {
                    const url = yield* server.getUrl()
                    return url
                }).pipe(
                    Effect.scoped
                )
            )

            // Display test setup information
            console.log("\n=== Mock Server Ready ===")
            console.log(`WebSocket URL: ${mockUrl}`)
            console.log("\nTest Agent IDs:")
            console.log("- test-agent-1")
            console.log("- test-agent-2")
            console.log("\nAvailable Tools:")
            console.log("- weather:get - Get current weather for a location")
            console.log("- time:get - Get current time for a timezone")

            console.log("\n=== Connection Instructions ===")
            console.log("1. Configure your chat app to connect to the WebSocket URL above")
            console.log("2. Subscribe to one of the test agent IDs")
            console.log("3. Send messages to test functionality")
            console.log("4. Try tool invocation with weather and time requests")
            console.log("\nPress Ctrl+C to stop the test server")

            // Keep the server running until manually stopped
            await new Promise(() => { }) // This will run until the process is terminated
        },
        catch: (error) => error
    })
    await Effect.runPromise(
        integrationEffect.pipe(
            Effect.catchAll((error) =>
                Effect.sync(() => {
                    console.error("Error setting up test server:", error)
                })
            ),
            Effect.ensuring(
                Effect.sync(async () => {
                    // Clean up resources when terminated
                    console.log("\nCleaning up test resources...")
                    await Effect.runPromise(Scope.close(scope, Exit.succeed(undefined)))
                    console.log("Test server stopped")
                })
            )
        )
    )
}

// Run the integration test when this script is executed directly
if (require.main === module) {
    testChatAppIntegration().catch(console.error)
} 