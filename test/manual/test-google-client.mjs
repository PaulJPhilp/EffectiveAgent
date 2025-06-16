#!/usr/bin/env node
import { Effect } from "effect";
import { makeGoogleClient } from "./src/services/ai/provider/clients/google-provider-client.js";

/**
 * Simple test to verify that the Google provider client has the generateObject method
 */
async function testGoogleClient() {
  try {
    // Get API key from environment
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("ERROR: GOOGLE_API_KEY environment variable is not set");
      process.exit(1);
    }
    
    console.log("Creating Google provider client...");
    
    // Create provider client directly
    const providerClient = await Effect.runPromise(makeGoogleClient(apiKey));
    
    console.log("Google provider client created successfully");
    console.log("Available methods:", Object.keys(providerClient));
    
    // Check for generateObject method specifically
    if (typeof providerClient.generateObject === "function") {
      console.log("✅ generateObject method exists on the Google provider client");
      
      // Attempt to invoke it with minimal arguments to verify it runs
      console.log("Testing with minimal arguments (won't complete but should start executing)...");
      try {
        const result = await Effect.runPromise(
          providerClient.generateObject(
            {
              messages: []
            },
            {
              modelId: "gemini-pro",
              schema: { type: "object", properties: { test: { type: "string" } } }
            }
          )
        );
        console.log("Result:", result);
      } catch (invokeError) {
        console.log("Expected error when invoking with minimal args:", invokeError.message);
      }
    } else {
      console.error("❌ generateObject method does not exist on the Google provider client");
      console.error("Available methods:", Object.keys(providerClient));
    }
  } catch (error) {
    console.error("Error testing Google client:", error);
    process.exit(1);
  }
}

// Run the test
console.log("Starting test of Google provider client...");
testGoogleClient();
