#!/usr/bin/env -S bun run

import { Effect, Layer } from "effect";
import { WeatherService } from "../service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";

// Test normal case
const testNormal = Effect.gen(function* () {
  const service = yield* WeatherService;
  
  console.log("\nTesting normal case...");
  const weather = yield* service.getWeather({ location: "New York" });
  console.log("Weather:", JSON.stringify(weather, null, 2));

  const summary = yield* service.getWeatherSummary({ location: "New York" });
  console.log("Summary:", summary);
});

// Test error case
const testError = Effect.gen(function* () {
  const service = yield* WeatherService;
  
  console.log("\nTesting error case...");
  try {
    yield* service.getWeather({ location: "" });
  } catch (error) {
    console.log("Got expected error:", error);
  }
});

// Run tests
console.log("Starting WeatherService tests...");

// Create layers with dependencies
const MainLayer = Layer.mergeAll(
  ConfigurationService.Default,
  WeatherService.Default
);

// Run program with dependencies
const program = Effect.gen(function* () {
  yield* testNormal;
  yield* testError;
});

Effect.runPromise(
  Effect.provide(program, MainLayer)
).catch(console.error);
