/**
 * Tests for EA SDK helper utilities
 * @file Tests the helper functions for LangGraph integration
 */

import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import type { AgentRuntimeServiceApi } from "../api.js"
import {
    createActivity,
    createNodeErrorHandler,
    createStateTransformer,
    getStateProperty,
    mergeState,
    runEffect,
    setStateProperty,
    validateStateStructure,
    wrapLangGraphNode
} from "../helpers.js"
import type { LangGraphAgentState } from "../types.js"

// Mock AgentRuntimeServiceApi for testing
const createMockAgentRuntime = (): AgentRuntimeServiceApi => ({
    create: () => Effect.succeed({} as any),
    terminate: () => Effect.succeed(undefined),
    send: () => Effect.succeed(undefined),
    getState: () => Effect.succeed({} as any),
    subscribe: () => ({} as any),
    getModelService: () => Effect.succeed({} as any),
    getProviderService: () => Effect.succeed({} as any),
    getPolicyService: () => Effect.succeed({} as any),
    getToolRegistryService: () => Effect.succeed({} as any),
    getFileService: () => Effect.succeed({} as any),
    getChatService: () => Effect.succeed({} as any),
    createLangGraphAgent: () => Effect.succeed({
        agentRuntime: {
            id: "test-agent-123" as any,
            send: () => Effect.succeed(undefined),
            getState: () => Effect.succeed({} as any),
            subscribe: () => ({} as any)
        },
        agentRuntimeId: "test-agent-123" as any
    }),
    run: <Output>(logicToRun: Effect.Effect<Output, any, any>) => Effect.runPromise(logicToRun as any)
})

// Test state interface
interface TestAgentState extends LangGraphAgentState<{ userId: string }> {
    messages: Array<{ content: string; timestamp: number }>
    currentStep: string
    lastActivity?: number
}

describe("EA SDK Helpers", () => {
    describe("runEffect", () => {
        it("should execute Effect and return Promise result", async () => {
            const mockRuntime = createMockAgentRuntime()
            const testEffect = Effect.succeed("test result")

            const result = await runEffect(mockRuntime, testEffect)

            expect(result).toBe("test result")
        })

        it("should handle Effect errors with context", async () => {
            const mockRuntime = createMockAgentRuntime()
            const testEffect = Effect.fail(new Error("Test error"))

            await expect(
                runEffect(mockRuntime, testEffect, {
                    operation: "test_op",
                    nodeId: "test-node",
                    agentId: "agent-123"
                })
            ).rejects.toThrow("Effect execution failed in LangGraph node (test-node)")
        })
    })

    describe("createActivity", () => {
        it("should create activity payload with standard metadata", () => {
            const activity = createActivity("user_message",
                { message: "Hello", userId: "123" },
                { priority: "high" }
            )

            expect(activity.operation).toBe("user_message")
            expect(activity.data).toEqual({ message: "Hello", userId: "123" })
            expect(activity.metadata?.source).toBe("ea-sdk-helpers")
            expect(activity.metadata?.version).toBe("1.0.0")
            expect(activity.metadata?.priority).toBe("high")
            expect(activity.metadata?.timestamp).toBeDefined()
        })

        it("should work with minimal parameters", () => {
            const activity = createActivity("ping")

            expect(activity.operation).toBe("ping")
            expect(activity.data).toEqual({})
            expect(activity.metadata?.source).toBe("ea-sdk-helpers")
        })
    })

    describe("getStateProperty", () => {
        const testState: TestAgentState = {
            agentRuntime: createMockAgentRuntime(),
            context: { userId: "user123" },
            messages: [
                { content: "Hello", timestamp: 1234567890 }
            ],
            currentStep: "processing"
        }

        it("should get nested properties with dot notation", () => {
            expect(getStateProperty(testState, "context.userId", "default")).toBe("user123")
            expect(getStateProperty(testState, "messages.0.content", "default")).toBe("Hello")
            expect(getStateProperty(testState, "currentStep", "default")).toBe("processing")
        })

        it("should return fallback for missing properties", () => {
            expect(getStateProperty(testState, "missing.property", "fallback")).toBe("fallback")
            expect(getStateProperty(testState, "context.missing", 42)).toBe(42)
        })

        it("should handle undefined and null gracefully", () => {
            const stateWithNulls = { ...testState, context: null } as unknown as TestAgentState
            expect(getStateProperty(stateWithNulls, "context.userId", "fallback")).toBe("fallback")
        })
    })

    describe("setStateProperty", () => {
        const testState: TestAgentState = {
            agentRuntime: createMockAgentRuntime(),
            context: { userId: "user123" },
            messages: [],
            currentStep: "initial"
        }

        it("should set nested properties with dot notation", () => {
            const newState = setStateProperty(testState, "context.userId", "newUser")

            expect(newState.context?.userId).toBe("newUser")
            expect(newState.currentStep).toBe("initial") // unchanged
            expect(newState).not.toBe(testState) // new object
        })

        it("should create nested objects if they don't exist", () => {
            const newState = setStateProperty(testState, "newSection.newProperty", "value")

            expect((newState as any).newSection.newProperty).toBe("value")
        })

        it("should set top-level properties", () => {
            const newState = setStateProperty(testState, "currentStep", "completed")

            expect(newState.currentStep).toBe("completed")
        })
    })

    describe("mergeState", () => {
        const testState: TestAgentState = {
            agentRuntime: createMockAgentRuntime(),
            context: { userId: "user123" },
            messages: [],
            currentStep: "initial"
        }

        it("should merge partial updates into state", () => {
            const updates = {
                currentStep: "processing" as const,
                lastActivity: 1234567890
            }

            const newState = mergeState(testState, updates)

            expect(newState.currentStep).toBe("processing")
            expect(newState.lastActivity).toBe(1234567890)
            expect(newState.context).toBe(testState.context) // unchanged
            expect(newState).not.toBe(testState) // new object
        })
    })

    describe("createNodeErrorHandler", () => {
        it("should create error handler with context", () => {
            const handleError = createNodeErrorHandler("test-node", "agent-123")
            const testError = new Error("Test error")

            const sdkError = handleError(testError, "Custom message")

            expect(sdkError.message).toBe("Custom message")
            expect(sdkError.operation).toBe("test-node")
            expect(sdkError.agentId).toBe("agent-123")
            expect(sdkError.cause).toBe(testError)
        })

        it("should use default message when none provided", () => {
            const handleError = createNodeErrorHandler("test-node")
            const sdkError = handleError(new Error("Test error"))

            expect(sdkError.message).toBe("Error in LangGraph node 'test-node'")
        })
    })

    describe("wrapLangGraphNode", () => {
        const testState: TestAgentState = {
            agentRuntime: createMockAgentRuntime(),
            context: { userId: "user123" },
            messages: [],
            currentStep: "initial"
        }

        it("should wrap node function and handle success", async () => {
            const nodeFunction = async (state: TestAgentState) => ({
                ...state,
                currentStep: "completed"
            })

            const wrappedNode = wrapLangGraphNode("test-node", nodeFunction)
            const result = await wrappedNode(testState)

            expect(result.currentStep).toBe("completed")
        })

        it("should wrap node function and handle errors", async () => {
            const nodeFunction = async (_state: TestAgentState): Promise<TestAgentState> => {
                throw new Error("Node failed")
            }

            const wrappedNode = wrapLangGraphNode("test-node", nodeFunction)

            await expect(wrappedNode(testState)).rejects.toThrow("Node 'test-node' execution failed")
        })
    })

    describe("validateStateStructure", () => {
        const testState: TestAgentState = {
            agentRuntime: createMockAgentRuntime(),
            context: { userId: "user123" },
            messages: [],
            currentStep: "initial"
        }

        it("should pass validation when all required paths exist", () => {
            expect(() => {
                validateStateStructure(testState, [
                    "agentRuntime",
                    "context.userId",
                    "messages",
                    "currentStep"
                ])
            }).not.toThrow()
        })

        it("should throw error when required paths are missing", () => {
            expect(() => {
                validateStateStructure(testState, [
                    "agentRuntime",
                    "missing.property",
                    "another.missing.path"
                ], { nodeId: "test-node" })
            }).toThrow("State validation failed: missing required properties [missing.property, another.missing.path]")
        })
    })

    describe("createStateTransformer", () => {
        const testState: TestAgentState = {
            agentRuntime: createMockAgentRuntime(),
            context: { userId: "user123" },
            messages: [],
            currentStep: "initial"
        }

        it("should create reusable state transformer", () => {
            const addMessage = createStateTransformer<TestAgentState, string>(
                (message, state) => ({
                    ...state,
                    messages: [...state.messages, { content: message, timestamp: Date.now() }]
                })
            )

            const newState = addMessage("Hello, world!", testState)

            expect(newState.messages).toHaveLength(1)
            expect(newState.messages?.[0]?.content).toBe("Hello, world!")
            expect(newState.messages?.[0]?.timestamp).toBeDefined()
        })

        it("should be reusable across multiple calls", () => {
            const updateStep = createStateTransformer<TestAgentState, string>(
                (step, state) => ({ ...state, currentStep: step })
            )

            const state1 = updateStep("processing", testState)
            const state2 = updateStep("completed", state1)

            expect(state1.currentStep).toBe("processing")
            expect(state2.currentStep).toBe("completed")
        })
    })
}) 