/**
 * @file Example Runner - Demonstrates AgentRuntime examples
 * @module examples/runner
 */

import "dotenv/config";

import { AgentRuntimeService } from "@/ea-agent-runtime/index.js";
import { StructuredOutputAgent } from "@/examples/structured-output/agent.js";
import { WeatherAgent } from "@/examples/weather/agent.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { ObjectService } from "@/services/pipeline/producers/object/service.js";
import { TextService } from "@/services/pipeline/producers/text/service.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Schema } from "effect";

// Example schema for travel recommendation
const TravelRecommendationSchema = Schema.Struct({
    destination: Schema.String,
    weatherSummary: Schema.String,
    recommendedActivities: Schema.Array(Schema.String),
    bestTimeToVisit: Schema.String,
    clothingRecommendations: Schema.Array(Schema.String)
});

type TravelRecommendation = Schema.Schema.Type<typeof TravelRecommendationSchema>;

/**
 * Example demonstrating how to use both Weather and StructuredOutput agents together
 */
export const runExample = Effect.gen(function* () {
    console.log("🚀 Starting AgentRuntime Example...");

    // Initialize both agents
    const weatherAgent = yield* WeatherAgent;
    const structuredAgent = yield* StructuredOutputAgent;

    const destination = "Tokyo";

    console.log(`\n📍 Getting weather data for ${destination}...`);

    // Get weather data
    const weatherData = yield* weatherAgent.getWeather({
        location: destination,
        units: { type: "celsius", windSpeedUnit: "mps" }
    });

    console.log("✅ Weather data retrieved:", {
        location: weatherData.location.name,
        temperature: `${weatherData.temperature}°C`,
        conditions: weatherData.conditions[0]?.condition,
        humidity: `${weatherData.humidity}%`,
        windSpeed: `${weatherData.windSpeed} m/s`
    });

    // Get weather summary
    const weatherSummary = yield* weatherAgent.getWeatherSummary({
        location: destination,
        units: { type: "celsius", windSpeedUnit: "mps" }
    });

    console.log("📝 Weather summary:", weatherSummary);

    console.log("\n🏗️ Generating travel recommendation...");

    // Generate structured travel recommendation using the weather data
    const travelRec = yield* structuredAgent.generateStructuredOutput<TravelRecommendation>({
        prompt: `Based on this weather data for ${destination}:
        Temperature: ${weatherData.temperature}°C
        Conditions: ${weatherData.conditions[0]?.condition}
        Humidity: ${weatherData.humidity}%
        Wind Speed: ${weatherData.windSpeed} m/s
        
        Generate a comprehensive travel recommendation including:
        - Weather summary
        - Recommended activities based on the weather
        - Best time to visit
        - Clothing recommendations
        
        Make it practical and specific to the current weather conditions.`,
        schema: TravelRecommendationSchema
    });

    console.log("✅ Travel recommendation generated:", {
        destination: travelRec.destination,
        weatherSummary: travelRec.weatherSummary,
        activities: travelRec.recommendedActivities.slice(0, 3),
        bestTime: travelRec.bestTimeToVisit,
        clothing: travelRec.clothingRecommendations.slice(0, 3)
    });

    // Show agent states
    console.log("\n📊 Agent States:");

    const weatherState = yield* weatherAgent.getAgentState();
    console.log("Weather Agent:", {
        requestCount: weatherState.requestCount,
        hasCurrentWeather: weatherState.currentWeather._tag === "Some"
    });

    const structuredState = yield* structuredAgent.getAgentState();
    console.log("Structured Output Agent:", {
        generationCount: structuredState.generationCount,
        historyLength: structuredState.generationHistory.length
    });

    // Cleanup
    console.log("\n🧹 Cleaning up agents...");
    yield* weatherAgent.terminate();
    yield* structuredAgent.terminate();

    console.log("✅ Example completed successfully!");

    return {
        weatherData,
        weatherSummary,
        travelRecommendation: travelRec,
        weatherAgentState: weatherState,
        structuredAgentState: structuredState
    };
}).pipe(
    Effect.provide(WeatherAgent.Default),
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