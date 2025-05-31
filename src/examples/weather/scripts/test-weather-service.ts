#!/usr/bin/env -S bun run

import { AgentRuntimeService } from "@/agent-runtime/service.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import TextService from "@/services/pipeline/producers/text/service.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, LogLevel, Logger } from "effect";
import { WeatherAgent } from "../agent.js";

// Set up environment for testing
process.env.MASTER_CONFIG_PATH = process.env.MASTER_CONFIG_PATH || "./config/master-config.json";
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key-for-mock";

// Temporary: Set individual config paths until services are updated to use master config
process.env.MODELS_CONFIG_PATH = process.env.MODELS_CONFIG_PATH || "./config/models.json";
process.env.PROVIDERS_CONFIG_PATH = process.env.PROVIDERS_CONFIG_PATH || "./config/providers.json";

// Test normal case
const testNormal = Effect.gen(function* () {
  const agent = yield* WeatherAgent;

  console.log("\nTesting normal case...");
  const weather = yield* agent.getWeather({
    location: "New York",
    units: { type: "celsius", windSpeedUnit: "mps" }
  });
  console.log("Weather:", JSON.stringify(weather, null, 2));

  const summary = yield* agent.getWeatherSummary({
    location: "New York",
    units: { type: "celsius", windSpeedUnit: "mps" }
  });
  console.log("Summary:", summary);

  // Check agent state
  const state = yield* agent.getAgentState();
  console.log("Agent state:", JSON.stringify(state, null, 2));

  // Cleanup
  yield* agent.terminate();
});

// Test error case
const testError = Effect.gen(function* () {
  const agent = yield* WeatherAgent;

  console.log("\nTesting error case...");
  try {
    yield* agent.getWeather({
      location: "",
      units: { type: "celsius", windSpeedUnit: "mps" }
    });
  } catch (error) {
    console.log("Got expected error:", error);
  }

  // Cleanup
  yield* agent.terminate();
});

// Run tests
console.log("Starting WeatherAgent tests...");

// Run program with all required dependencies
const program = Effect.gen(function* () {
  yield* testNormal;
  yield* testError;
}).pipe(
  Effect.provide(WeatherAgent.Default),
  Effect.provide(AgentRuntimeService.Default),
  Effect.provide(TextService.Default),
  Effect.provide(ModelService.Default),
  Effect.provide(ProviderService.Default),
  Effect.provide(ConfigurationService.Default),
  Effect.provide(NodeFileSystem.layer),
  Effect.provide(Logger.minimumLogLevel(LogLevel.Info))
);

Effect.runPromise(program).catch(console.error);
