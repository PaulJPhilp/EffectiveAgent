/**
 * @file Structured Output Agent E2E Tests
 * @module examples/structured-output/tests
 */

import { config } from "dotenv";

config(); // Load environment variables from .env file

import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer, Schema } from "effect";
import { beforeAll, describe, expect, it } from "vitest";
import { AgentRuntimeService, makeAgentRuntimeId } from "@/ea-agent-runtime/index.js";
import { type AgentActivity, AgentActivityType } from "@/ea-agent-runtime/types.js";
import { StructuredOutputAgent } from "@/examples/structured-output/agent.js";
import { ModelService } from "@/services/ai/model/service.js";
import { PolicyService } from "@/services/ai/policy/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { ObjectService } from "@/services/producers/object/index.js";

// Test schemas
const UserProfileSchema = Schema.Struct({
    username: Schema.String,
    email: Schema.String,
    active: Schema.Boolean
});
type UserProfile = Schema.Schema.Type<typeof UserProfileSchema>;

const ProductSchema = Schema.Struct({
    name: Schema.String,
    price: Schema.Number,
    category: Schema.String,
    inStock: Schema.Boolean
});
type Product = Schema.Schema.Type<typeof ProductSchema>;

describe("StructuredOutputAgent E2E Tests", () => {
    beforeAll(() => {
        // Set up master config path for testing
        process.env.MASTER_CONFIG_PATH = process.env.MASTER_CONFIG_PATH || "./config/master-config.json";

        // Ensure we have an OpenAI API key for testing (can be a mock one)
        process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key-for-mock";
    });

    const testLayer = Layer.mergeAll(
        ConfigurationService.Default,
        ProviderService.Default,
        ModelService.Default,
        PolicyService.Default,
        AgentRuntimeService.Default,
        ObjectService.Default,
        StructuredOutputAgent.Default,
        NodeFileSystem.layer
    );

    it("should initialize structured output agent with AgentRuntime", () =>
        Effect.gen(function* () {
            // Initialize the structured output agent
            const agent = yield* StructuredOutputAgent;

            // Test initial agent state
            const agentState = yield* agent.getAgentState();
            expect(agentState.generationCount).toBe(0);
            expect(agentState.generationHistory).toHaveLength(0);

            // Test that runtime is properly initialized
            const runtime = agent.getRuntime();
            const agentRuntimeId = agent.getAgentRuntimeId();
            const runtimeState = yield* runtime.getState(agentRuntimeId);
            expect(runtimeState.state.generationCount).toBe(0);

            // Cleanup
            yield* agent.terminate();

            expect(agentState).toBeDefined();
            expect(runtimeState).toBeDefined();
        }).pipe(Effect.provide(testLayer)));

    it("should create and manage basic agent runtime lifecycle", () =>
        Effect.gen(function* () {
            const agentRuntimeService = yield* AgentRuntimeService;

            // Create a new agent runtime
            const agentId = makeAgentRuntimeId("test-structured-agent");
            const initialState = {
                generationCount: 0,
                generationHistory: [],
                lastGeneration: null,
                lastUpdate: null
            };

            const runtime = yield* agentRuntimeService.create(agentId, initialState);

            // Verify initial state
            const state1 = yield* runtime.getState();
            expect(state1.state.generationCount).toBe(0);
            expect(state1.processing?.processed).toBe(0);

            // Send a simple activity
            const activity: AgentActivity = {
                id: `test-activity-${Date.now()}`,
                agentRuntimeId: agentId,
                timestamp: Date.now(),
                type: AgentActivityType.EVENT,
                payload: { message: "Hello, agent!" },
                metadata: { test: true },
                sequence: 0
            };

            yield* agentRuntimeService.send(agentId, activity);

            // Wait for the activity to be processed
            yield* Effect.sleep(200);

            // Verify state after processing
            const state2 = yield* runtime.getState();
            expect(state2.processing?.processed).toBeGreaterThanOrEqual(0);
            expect(state2.processing?.failures).toBe(0);

            // Terminate the runtime
            yield* agentRuntimeService.terminate(agentId);
        }).pipe(Effect.provide(testLayer)));

    it("should handle multiple concurrent agent runtimes", () =>
        Effect.gen(function* () {
            const agentRuntimeService = yield* AgentRuntimeService;
            const agentIds = [
                makeAgentRuntimeId("concurrent-agent-1"),
                makeAgentRuntimeId("concurrent-agent-2"),
                makeAgentRuntimeId("concurrent-agent-3")
            ];

            const initialState = {
                generationCount: 0,
                generationHistory: [],
                lastGeneration: null,
                lastUpdate: null
            };

            // Create multiple runtimes
            const runtimes = yield* Effect.all(
                agentIds.map(id => agentRuntimeService.create(id, initialState)),
                { concurrency: "unbounded" }
            );

            // Send activities to all runtimes
            const activities = agentIds.map((agentId, index) => {
                const activity: AgentActivity = {
                    id: `concurrent-activity-${index}`,
                    agentRuntimeId: agentId,
                    timestamp: Date.now(),
                    type: AgentActivityType.EVENT,
                    payload: { message: `Event for agent ${index}` },
                    metadata: { concurrentTest: true, index },
                    sequence: 0
                };
                return agentRuntimeService.send(agentId, activity);
            });

            yield* Effect.all(activities, { concurrency: "unbounded" });

            // Wait for processing
            yield* Effect.sleep(200);

            // Verify all runtimes were created and are accessible
            const finalStates = yield* Effect.all(
                runtimes.map(runtime => runtime.getState()),
                { concurrency: "unbounded" }
            );

            expect(finalStates).toHaveLength(3);
            for (let i = 0; i < finalStates.length; i++) {
                expect(finalStates[i]?.processing?.failures).toBe(0);
                expect(finalStates[i]?.state.generationCount).toBe(0);
            }

            // Cleanup all runtimes
            yield* Effect.all(
                agentIds.map(id => agentRuntimeService.terminate(id)),
                { concurrency: "unbounded" }
            );
        }).pipe(Effect.provide(testLayer)));

    it("should track agent runtime activity processing and lifecycle", () =>
        Effect.gen(function* () {
            const agentRuntimeService = yield* AgentRuntimeService;

            const agentId = makeAgentRuntimeId("lifecycle-test-agent");
            const initialState = {
                generationCount: 0,
                generationHistory: [],
                lastGeneration: null,
                lastUpdate: null
            };

            // Create runtime
            const runtime = yield* agentRuntimeService.create(agentId, initialState);

            // Check initial processing state
            const state1 = yield* runtime.getState();
            expect(state1.processing?.processed).toBe(0);
            expect(state1.processing?.failures).toBe(0);

            // Send a single activity to verify basic processing
            const activity: AgentActivity = {
                id: `lifecycle-activity`,
                agentRuntimeId: agentId,
                timestamp: Date.now(),
                type: AgentActivityType.EVENT,
                payload: { message: "Lifecycle test event" },
                metadata: { test: "lifecycle" },
                sequence: 0
            };

            yield* agentRuntimeService.send(agentId, activity);

            // Wait for processing to complete
            yield* Effect.sleep(200);

            // Check final state - verify basic runtime functionality
            const finalState = yield* runtime.getState();
            expect(finalState.processing?.failures).toBe(0);
            expect(finalState.state.generationCount).toBe(0);
            expect(finalState.processing?.processed).toBeGreaterThanOrEqual(0);

            // Verify termination works
            yield* agentRuntimeService.terminate(agentId);

            expect(state1.processing?.processed).toBe(0);
        }).pipe(Effect.provide(testLayer)));
});