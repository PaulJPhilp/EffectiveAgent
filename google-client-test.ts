#!/usr/bin/env bun
/**
 * Simple provider client test that follows project architecture
 */
import { Effect, Console } from "effect";
import { ProviderService } from "./src/services/ai/provider/service.js";
import { GoogleProvider } from "./src/services/ai/provider/schema.js";
import { InitializationService } from "./src/services/core/initialization/service.js";

/**
 * Tests if the Google provider client has the generateObject method
 */
const testProviderClient = Effect.gen(function* () {
  // Initialize the application with core services
  yield* InitializationService.initialize({
    fileSystem: "node",
    loggingLevel: "info",
    loggingFilePath: "./logs/test.log"
  });

  yield* Console.log("Services initialized");

  // Get provider service and retrieve the Google client
  const providerService = yield* ProviderService;
  const googleClient = yield* providerService.getProviderClient("google");

  // Check for generateObject method
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(googleClient))
    .filter(method => method !== "constructor");
  
  yield* Console.log("Available methods:", methods);

  if (typeof googleClient.generateObject === "function") {
    yield* Console.log("✅ generateObject method exists on the Google provider client");
    return Effect.succeed(true);
  } else {
    yield* Console.error("❌ generateObject method not found on Google provider client");
    return Effect.fail(new Error("generateObject method not available"));
  }
});

// Run the test
Effect.runPromise(
  Effect.gen(function* () {
    try {
      yield* Console.log("Starting provider client test...");
      const result = yield* testProviderClient;
      yield* Console.log("Test completed successfully");
      return result;
    } catch (error) {
      yield* Console.error("Test failed:", error);
      process.exit(1);
    }
  })
);
