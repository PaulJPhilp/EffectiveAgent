#!/usr/bin/env bun
import { Effect, Console } from "effect";
import { makeGoogleClient } from "./src/services/ai/provider/clients/google-provider-client.js";

/**
 * Simple test to verify that the Google provider client has the generateObject method
 */
const testGoogleClient = Effect.gen(function* () {
  // Get API key from environment
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    yield* Console.error("ERROR: GOOGLE_API_KEY environment variable is not set");
    return Effect.fail(new Error("GOOGLE_API_KEY not set"));
  }
  
  yield* Console.log("Creating Google provider client...");
  
  // Create provider client directly
  const providerClient = yield* makeGoogleClient(apiKey);
  
  yield* Console.log("Google provider client created successfully");
  yield* Console.log("Available methods:", Object.keys(providerClient));
  
  // Check for generateObject method specifically
  if (typeof providerClient.generateObject === "function") {
    yield* Console.log("✅ generateObject method exists on the Google provider client");
    
    // Return success
    return Effect.succeed("Google client has generateObject method");
  } else {
    yield* Console.error("❌ generateObject method does not exist on the Google provider client");
    yield* Console.error("Available methods:", Object.keys(providerClient));
    return Effect.fail(new Error("generateObject method not found"));
  }
});

// Run the test
Effect.runPromise(
  Effect.gen(function* () {
    yield* Console.log("Starting test of Google provider client...");
    try {
      const result = yield* testGoogleClient;
      yield* Console.log("Test completed successfully:", result);
    } catch (error) {
      yield* Console.error("Test failed:", error);
      process.exit(1);
    }
  })
);
