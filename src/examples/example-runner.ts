/**
 * @file Example Runner - Demonstrates AgentRuntime examples
 * @module examples/runner
 */

import "dotenv/config";

import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Schema } from "effect";
import { AgentRuntimeService } from "@/ea-agent-runtime/index.js";
import { StructuredOutputAgent } from "@/examples/structured-output/agent.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { ObjectService } from "@/services/producers/object/service.js";
import { TextService } from "@/services/producers/text/service.js";

// Example schema for travel recommendation
const TravelRecommendationSchema = Schema.Struct({
    destination: Schema.String,
    recommendedActivities: Schema.Array(Schema.String),
    bestTimeToVisit: Schema.String,
    travelTips: Schema.Array(Schema.String)
});

type TravelRecommendation = Schema.Schema.Type<typeof TravelRecommendationSchema>;

/**
 * Example demonstrating how to use the StructuredOutput agent
 */
export const runExample = Effect.gen(function* () {
    console.log("🚀 Starting AgentRuntime Example...");

    // Initialize the structured output agent
    const structuredAgent = yield* StructuredOutputAgent;

    const destination = "Tokyo";

    console.log("\n🏗️ Generating travel recommendation...");

    // Generate structured travel recommendation
    const travelRec = yield* structuredAgent.generateStructuredOutput<TravelRecommendation>({
        prompt: `Generate a comprehensive travel recommendation for visiting ${destination}.
        
        Include:
        - Recommended activities for tourists
        - Best time to visit
        - Practical travel tips
        
        Make it informative and engaging.`,
        schema: TravelRecommendationSchema
    });

    console.log("✅ Travel recommendation generated:", {
        destination: travelRec.destination,
        activities: travelRec.recommendedActivities.slice(0, 3),
        bestTime: travelRec.bestTimeToVisit,
        tips: travelRec.travelTips.slice(0, 3)
    });

    // Show agent state
    console.log("\n📊 Agent State:");

    const structuredState = yield* structuredAgent.getAgentState();
    console.log("Structured Output Agent:", {
        generationCount: structuredState.generationCount,
        historyLength: structuredState.generationHistory.length
    });

    // Cleanup
    console.log("\n🧹 Cleaning up agent...");
    yield* structuredAgent.terminate();

    console.log("✅ Example completed successfully!");

    return {
        travelRecommendation: travelRec,
        structuredAgentState: structuredState
    };
}).pipe(
    Effect.provide(StructuredOutputAgent.Default),
    Effect.provide(AgentRuntimeService.Default),
    Effect.provide(TextService.Default),
    Effect.provide(ObjectService.Default),
    Effect.provide(ModelService.Default),
    Effect.provide(ProviderService.Default),
    Effect.provide(ConfigurationService.Default),
    Effect.provide(NodeFileSystem.layer),
    Effect.catchAll((error) => {
        console.error("❌ Example failed:", error);
        return Effect.fail(error);
    })
);

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log("🏃 Running example directly...");

    // Set default config paths if not set
    process.env.PROVIDERS_CONFIG_PATH = process.env.PROVIDERS_CONFIG_PATH || "config/providers.json";
    process.env.MODELS_CONFIG_PATH = process.env.MODELS_CONFIG_PATH || "config/models.json";

    Effect.runPromise(runExample as any)
        .then(() => {
            console.log("🎉 All done!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("💥 Fatal error:", error);
            process.exit(1);
        });
} 