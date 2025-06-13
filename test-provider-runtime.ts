#!/usr/bin/env bun
/**
 * Test script to verify Google provider client has generateObject method
 * Using EA agent runtime for proper initialization
 */

import { Effect, Console } from "effect";
import { runWithAgentRuntime } from "./src/ea-agent-runtime/index.js";
import { ProviderService } from "./src/services/ai/provider/service.js";

// Main test effect
const testProviderClient = Effect.gen(function* () {
  // Get provider service through the agent runtime
  yield* Console.log("Getting provider service...");
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
    return Effect.succeed(true);
  } else {
    yield* Console.error("❌ generateObject method not found on Google client");
    yield* Console.error("Available methods:", methods);
    return Effect.fail(new Error("generateObject method not available"));
  }
});

// Run the test using agent runtime
(async () => {
  try {
    // Run the test effect using the agent runtime
    const result = await runWithAgentRuntime(testProviderClient);
    console.log("Test completed successfully:", result);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
})();
