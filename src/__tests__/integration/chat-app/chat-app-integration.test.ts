/**
 * Test script for integrating the chat app with MockWebSocketServer
 * 
 * This script sets up a MockWebSocketServer with test tools
 * that the chat app can connect to for integration testing.
 */

import { AgentActivity, AgentActivityType } from "@/agent-runtime/types.js"
import { ToolRegistryData, ToolRegistryDataTag } from "@/services/ai/tools/types.js"
import { AgentRuntimeService, ToolRegistryService } from "@/services/core/effect-services"
import { createServiceTestHarness } from "@/services/core/test-harness/utils/effect-test-harness.js"
import { Effect, HashMap, Layer, Schema as S, Stream } from "effect"

// Input schema for weather tool
class WeatherInput extends S.Class<WeatherInput>("WeatherInput")({
    location: S.String
}) { }

// Output schema for weather tool
class WeatherOutput extends S.Class<WeatherOutput>("WeatherOutput")({
    temperature: S.Number,
    conditions: S.String,
    location: S.String
}) { }

// Input schema for time tool
class TimeInput extends S.Class<TimeInput>("TimeInput")({
    timezone: S.optional(S.String)
}) { }

// Output schema for time tool
class TimeOutput extends S.Class<TimeOutput>("TimeOutput")({
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

describe('Chat App Integration', () => {
    let harness: ReturnType<typeof createServiceTestHarness>

    beforeAll(() => {
        // Provide the real Effect.Service classes for AgentRuntimeService and ToolRegistryService
        harness = createServiceTestHarness(
            Layer.mergeAll(
                AgentRuntimeService,
                ToolRegistryService
            )
        )
    })

    afterAll(async () => {
        await harness.close()
    })

    it('should handle chat interactions with tool calls', async () => {
        await harness.runTest(
            Effect.gen(function* () {
                // Use harness-provided mocks for all other dependencies
                // Example: const agentRuntime = yield* AgentRuntimeService
                // Example: const toolRegistry = yield* ToolRegistryService
                // Simulate chat interaction and assertions here
            })
        )
    })
}) 