/**
 * @file Structured Output Agent E2E Tests
 * @module examples/structured-output/tests
 */

import "dotenv/config";

import { AgentRuntimeService } from "@/agent-runtime/service.js";
import { StructuredOutputAgent } from "@/examples/structured-output/agent.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import ObjectService from "@/services/pipeline/producers/object/service.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Option, Schema } from "effect";
import { beforeAll, describe, expect, it } from "vitest";

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
        // Set up config paths for real testing
        process.env.PROVIDERS_CONFIG_PATH = process.env.PROVIDERS_CONFIG_PATH || "config/providers.json";
        process.env.MODELS_CONFIG_PATH = process.env.MODELS_CONFIG_PATH || "config/models.json";
    });

    it("should generate structured output through agent runtime", async () => {
        const test = Effect.gen(function* () {
            // Initialize the structured output agent
            const agent = yield* StructuredOutputAgent;

            // Test generating structured output
            const result = yield* agent.generateStructuredOutput<UserProfile>({
                prompt: "Generate a user profile for John Doe with email john@example.com who is active",
                schema: UserProfileSchema
            });

            // Verify the result
            expect(result).toBeDefined();
            expect(result.username).toBe("John Doe");
            expect(result.email).toBe("john@example.com");
            expect(result.active).toBe(true);

            // Test agent state
            const agentState = yield* agent.getAgentState();
            expect(agentState.generationCount).toBe(1);
            expect(Option.isSome(agentState.lastGeneration)).toBe(true);
            expect(Option.isSome(agentState.lastUpdate)).toBe(true);
            expect(agentState.generationHistory).toHaveLength(1);

            // Test second generation to verify state persistence
            yield* agent.generateStructuredOutput<Product>({
                prompt: "Generate a product for a laptop priced at $999 in the electronics category that is in stock",
                schema: ProductSchema
            });

            const updatedState = yield* agent.getAgentState();
            expect(updatedState.generationCount).toBe(2);
            expect(updatedState.generationHistory).toHaveLength(2);

            // Cleanup
            yield* agent.terminate();

            return { result, agentState, updatedState };
        }).pipe(
            Effect.provide(StructuredOutputAgent.Default),
            Effect.provide(AgentRuntimeService.Default),
            Effect.provide(ObjectService.Default),
            Effect.provide(ModelService.Default),
            Effect.provide(ProviderService.Default),
            Effect.provide(ConfigurationService.Default),
            Effect.provide(NodeFileSystem.layer)
        );

        const result = await Effect.runPromise(test as any);

        expect(result).toBeDefined();
        expect((result as any).result).toBeDefined();
        expect((result as any).agentState).toBeDefined();
        expect((result as any).updatedState).toBeDefined();
    });

    it("should extract structured data from text", async () => {
        const test = Effect.gen(function* () {
            const agent = yield* StructuredOutputAgent;

            // Test extracting structured data
            const text = `Here is a user profile for Jane Smith:
            - Username: jane.smith
            - Email: jane@example.com
            - Status: Active (true)`;

            const result = yield* agent.extractStructured<UserProfile>(
                text,
                UserProfileSchema,
                { modelId: "gpt-4o" }
            );

            // Verify the extracted data
            expect(result).toBeDefined();
            expect(result.username).toBe("jane.smith");
            expect(result.email).toBe("jane@example.com");
            expect(result.active).toBe(true);

            // Test agent state
            const agentState = yield* agent.getAgentState();
            expect(agentState.generationCount).toBe(1);
            expect(Option.isSome(agentState.lastGeneration)).toBe(true);

            // Cleanup
            yield* agent.terminate();

            return { result, agentState };
        }).pipe(
            Effect.provide(StructuredOutputAgent.Default),
            Effect.provide(AgentRuntimeService.Default),
            Effect.provide(ObjectService.Default),
            Effect.provide(ModelService.Default),
            Effect.provide(ProviderService.Default),
            Effect.provide(ConfigurationService.Default),
            Effect.provide(NodeFileSystem.layer)
        );

        const result = await Effect.runPromise(test as any);
        expect((result as any).result).toBeDefined();
    });

    it("should handle multiple concurrent generations", async () => {
        const test = Effect.gen(function* () {
            const agent = yield* StructuredOutputAgent;

            // Create multiple concurrent requests
            const userRequests = [
                agent.generateStructuredOutput<UserProfile>({
                    prompt: "Generate a user profile for Alice with email alice@test.com who is active",
                    schema: UserProfileSchema
                }),
                agent.generateStructuredOutput<UserProfile>({
                    prompt: "Generate a user profile for Bob with email bob@test.com who is inactive",
                    schema: UserProfileSchema
                })
            ];

            const productRequest = agent.generateStructuredOutput<Product>({
                prompt: "Generate a product for a phone priced at $699 in electronics that is in stock",
                schema: ProductSchema
            });

            // Execute user requests concurrently
            const userResults = yield* Effect.all(userRequests, { concurrency: "unbounded" });
            const productResult = yield* productRequest;

            // Verify all results
            expect(userResults).toHaveLength(2);
            expect(userResults[0]!.username).toBe("Alice");
            expect(userResults[0]!.active).toBe(true);
            expect(userResults[1]!.username).toBe("Bob");
            expect(userResults[1]!.active).toBe(false);
            expect(productResult.name).toBe("phone");
            expect(productResult.inStock).toBe(true);

            // Check agent state
            const finalState = yield* agent.getAgentState();
            expect(finalState.generationCount).toBe(3);
            expect(finalState.generationHistory).toHaveLength(3);

            // Cleanup
            yield* agent.terminate();

            return [...userResults, productResult];
        }).pipe(
            Effect.provide(StructuredOutputAgent.Default),
            Effect.provide(AgentRuntimeService.Default),
            Effect.provide(ObjectService.Default),
            Effect.provide(ModelService.Default),
            Effect.provide(ProviderService.Default),
            Effect.provide(ConfigurationService.Default),
            Effect.provide(NodeFileSystem.layer)
        );

        const results = await Effect.runPromise(test as any);
        expect((results as any).length).toBe(3);
    });

    it("should track agent runtime state correctly", async () => {
        const test = Effect.gen(function* () {
            const agent = yield* StructuredOutputAgent;
            const runtime = agent.getRuntime();

            // Check initial runtime state
            const initialRuntimeState = yield* runtime.getState();
            expect(initialRuntimeState.state.generationCount).toBe(0);
            expect(Option.isNone(initialRuntimeState.state.lastGeneration)).toBe(true);

            // Make a generation
            yield* agent.generateStructuredOutput<UserProfile>({
                prompt: "Generate a user profile for Test User with email test@example.com who is active",
                schema: UserProfileSchema
            });

            // Check runtime state after generation
            const updatedRuntimeState = yield* runtime.getState();
            expect(updatedRuntimeState.state.generationCount).toBe(1);
            expect(Option.isSome(updatedRuntimeState.state.lastGeneration)).toBe(true);
            expect(updatedRuntimeState.state.generationHistory).toHaveLength(1);

            // Cleanup
            yield* agent.terminate();

            return updatedRuntimeState;
        }).pipe(
            Effect.provide(StructuredOutputAgent.Default),
            Effect.provide(AgentRuntimeService.Default),
            Effect.provide(ObjectService.Default),
            Effect.provide(ModelService.Default),
            Effect.provide(ProviderService.Default),
            Effect.provide(ConfigurationService.Default),
            Effect.provide(NodeFileSystem.layer)
        );

        const finalState = await Effect.runPromise(test as any);
        expect((finalState as any).state.generationCount).toBe(1);
    });
}); 