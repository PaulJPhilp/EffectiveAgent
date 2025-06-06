/**
 * Basic test suite for Chat Agent
 * @file Tests the ChatAgent class import paths and basic functionality
 */

import { describe, expect, it } from "vitest"
import { createChatAgent } from "../agent/agent.js"

describe("Chat Agent Basic Tests", () => {
    it("should import createChatAgent function successfully", () => {
        expect(createChatAgent).toBeDefined()
        expect(typeof createChatAgent).toBe("function")
    })

    it("should create a chat agent with mock runtime", () => {
        // Create a minimal mock runtime for testing
        const mockRuntime = {
            createActor: () => Promise.resolve({ id: "test-actor" }),
            getActor: () => Promise.resolve({ id: "test-actor" }),
            terminateActor: () => Promise.resolve(),
            sendActivity: () => Promise.resolve(),
            getActorState: () => Promise.resolve({}),
            subscribeToActor: () => ({
                [Symbol.asyncIterator]: async function* () {
                    yield { type: "test", payload: {} }
                }
            })
        }

        const chatAgent = createChatAgent(mockRuntime as any, {
            maxMessages: 10,
            responseTimeoutMs: 30000,
            enableTopicTracking: true,
            defaultTone: "friendly"
        })

        expect(chatAgent).toBeDefined()
        expect(typeof chatAgent.createInitialState).toBe("function")
        expect(typeof chatAgent.addMessage).toBe("function")
        expect(typeof chatAgent.getSummary).toBe("function")
        expect(typeof chatAgent.getCompiledGraph).toBe("function")
    })

    it("should verify all imports are working", () => {
        // This test verifies that all the import path updates are working correctly
        // by ensuring the createChatAgent function can be imported and called
        expect(() => {
            const mockRuntime = {
                createActor: () => Promise.resolve({ id: "test" }),
                getActor: () => Promise.resolve({ id: "test" }),
                terminateActor: () => Promise.resolve(),
                sendActivity: () => Promise.resolve(),
                getActorState: () => Promise.resolve({}),
                subscribeToActor: () => ({
                    [Symbol.asyncIterator]: async function* () { }
                })
            }

            createChatAgent(mockRuntime as any, {})
        }).not.toThrow()
    })
}) 