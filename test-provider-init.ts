#!/usr/bin/env bun
/**
 * Test script to verify provider initialization and method availability
 * Uses proper initialization of service layers
 */

import { Effect, Console, Layer } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import { FileSystem } from "@effect/platform";
import { ProviderService } from "./src/services/ai/provider/service.js";
import { InitializationService } from "./src/services/core/initialization/service.js";

// First initialize the system properly with all dependencies
const testProviders = Effect.gen(function* () {
  // First initialize the core services
  yield* Console.log("Initializing services...");
  yield* InitializationService.initialize({
    fileSystem: "node",
    loggingLevel: "info",
    loggingFilePath: "./logs/test.log"
  });
  
  yield* Console.log("Services initialized successfully");
  
  // Get provider service
  const providerService = yield* ProviderService;
  yield* Console.log("Provider service obtained");
  
  // Get Google provider client
  yield* Console.log("Getting Google provider client...");
  const googleClient = yield* providerService.getProviderClient("google");
  
  // Check if client has generateObject method
  const methods = Object.keys(googleClient);
  yield* Console.log("Google client methods:", methods);
  
  if (typeof googleClient.generateObject === "function") {
    yield* Console.log("✅ generateObject method exists on Google client");
    return Effect.succeed(googleClient);
  } else {
    yield* Console.error("❌ generateObject method not found on Google client");
    yield* Console.error("Available methods:", methods);
    return Effect.fail(new Error("generateObject method not available"));
  }
});

// Run the test
Effect.runPromise(
  Effect.gen(function* () {
    try {
      yield* Console.log("Starting provider test...");
      const result = yield* testProviders;
      yield* Console.log("Test completed successfully");
    } catch (error) {
      yield* Console.error("Test failed:", error);
      process.exit(1);
    }
  })
);
