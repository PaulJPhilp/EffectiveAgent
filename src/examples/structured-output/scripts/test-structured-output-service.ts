#!/usr/bin/env bun

/**
 * @file Test script for Structured Output Agent
 * @module examples/structured-output/scripts/test-structured-output-service
 */

import "dotenv/config";

import { AgentRuntimeService } from "@/ea-agent-runtime/service.js";
import { StructuredOutputAgent } from "@/examples/structured-output/agent.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { ObjectService } from "@/services/producers/object/service.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, LogLevel, Logger, Option, Schema } from "effect";

// Set up environment for testing
process.env.MASTER_CONFIG_PATH = "./config/master-config.json";
// Use real OpenAI API key if available, otherwise use mock
if (!process.env.OPENAI_API_KEY) {
    console.log("⚠️  No OPENAI_API_KEY found - this will use the real OpenAI API if you have a key set");
    console.log("   Set OPENAI_API_KEY environment variable to use real OpenAI API");
    process.env.OPENAI_API_KEY = "test-key-for-mock";
}
process.env.MODELS_CONFIG_PATH = "./config/models.json";
process.env.PROVIDERS_CONFIG_PATH = "./config/providers.json";

// Test schemas
const PersonSchema = Schema.Struct({
    name: Schema.String,
    age: Schema.Number,
    email: Schema.String,
    isActive: Schema.Boolean
});

const ProductSchema = Schema.Struct({
    name: Schema.String,
    price: Schema.Number,
    category: Schema.String,
    inStock: Schema.Boolean,
    description: Schema.String
});

type Person = Schema.Schema.Type<typeof PersonSchema>;
type Product = Schema.Schema.Type<typeof ProductSchema>;

const runStructuredOutputTest = Effect.gen(function* () {
    yield* Effect.log("=== Starting Structured Output Agent Test ===");

    // Initialize the structured output agent
    const agent = yield* StructuredOutputAgent;
    yield* Effect.log("✅ Structured Output Agent initialized");

    // Test 1: Generate a person profile
    yield* Effect.log("🧪 Test 1: Generating person profile...");
    const person = yield* agent.generateStructuredOutput<Person>({
        prompt: "Generate a user profile for Sarah Johnson, age 28, email sarah.johnson@email.com, who is an active user",
        schema: PersonSchema
    });

    yield* Effect.log("✅ Person generated:", person);

    // Test 2: Generate a product
    yield* Effect.log("🧪 Test 2: Generating product...");
    const product = yield* agent.generateStructuredOutput<Product>({
        prompt: "Generate a product for a high-end gaming laptop priced at $1,899 in the electronics category that is currently in stock",
        schema: ProductSchema
    });

    yield* Effect.log("✅ Product generated:", product);

    // Test 3: Extract structured data from text
    yield* Effect.log("🧪 Test 3: Extracting structured data from text...");
    const textToExtract = `
    Here's a customer profile:
    Name: Michael Chen
    Age: 35
    Email: michael.chen@company.com
    Status: Active customer
  `;

    const extractedPerson = yield* agent.extractStructured<Person>(
        textToExtract,
        PersonSchema,
        { modelId: "gpt-4o" }
    );

    yield* Effect.log("✅ Extracted person:", extractedPerson);

    // Test 4: Check agent state
    yield* Effect.log("🧪 Test 4: Checking agent state...");
    const agentState = yield* agent.getAgentState();
    yield* Effect.log("📊 Agent State:", {
        generationCount: agentState.generationCount,
        lastUpdate: Option.isSome(agentState.lastUpdate) ? new Date(Option.getOrElse(agentState.lastUpdate, () => 0)) : "None",
        historyLength: agentState.generationHistory.length
    });

    // Test 5: Test concurrent generations
    yield* Effect.log("🧪 Test 5: Testing concurrent generations...");
    const concurrentResults = yield* Effect.all([
        agent.generateStructuredOutput<Person>({
            prompt: "Generate a person named Alice Smith, age 25, email alice@test.com, inactive",
            schema: PersonSchema
        }),
        agent.generateStructuredOutput<Product>({
            prompt: "Generate a smartphone product priced at $599 in electronics, out of stock",
            schema: ProductSchema
        })
    ], { concurrency: "unbounded" });

    yield* Effect.log("✅ Concurrent results:", concurrentResults);

    // Final agent state check
    const finalState = yield* agent.getAgentState();
    yield* Effect.log("📈 Final Agent State:", {
        totalGenerations: finalState.generationCount,
        historyLength: finalState.generationHistory.length
    });

    // Clean up
    yield* agent.terminate();
    yield* Effect.log("🧹 Agent terminated");

    yield* Effect.log("=== Structured Output Agent Test Completed Successfully! ===");

    return {
        person,
        product,
        extractedPerson,
        concurrentResults,
        finalState
    };
}).pipe(
    // Set up logging
    Effect.provide(Logger.pretty),
    Logger.withMinimumLogLevel(LogLevel.Info),
    // Provide all required services
    Effect.provide(StructuredOutputAgent.Default),
    Effect.provide(AgentRuntimeService.Default),
    Effect.provide(ObjectService.Default),
    Effect.provide(ModelService.Default),
    Effect.provide(ProviderService.Default),
    Effect.provide(ConfigurationService.Default),
    Effect.provide(NodeFileSystem.layer)
);

// Run the test
Effect.runPromise(runStructuredOutputTest)
    .then((result) => {
        console.log("🎉 Test completed successfully!");
        console.log("Results:", result);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }); 