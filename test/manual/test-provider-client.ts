#!/usr/bin/env bun
import { Effect } from "effect";
import { makeGoogleClient } from "./src/services/ai/provider/clients/google-provider-client.js";

// Simple test to verify the Google provider client has the generateObject method
const testProviderClient = async () => {
  // Get API key from environment
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    console.error("GOOGLE_API_KEY environment variable is not set");
    process.exit(1);
  }
  
  // Create provider client directly
  const providerClient = makeGoogleClient(apiKey);
  
  console.log("Provider client methods:");
  console.log(Object.keys(providerClient));
  
  // Check if generateObject exists
  if (typeof providerClient.generateObject === "function") {
    console.log("✅ generateObject method exists on the Google provider client");
  } else {
    console.error("❌ generateObject method does not exist on the Google provider client");
    console.error("Available methods:", Object.keys(providerClient));
  }
};

// Run the test
testProviderClient().catch(error => {
  console.error("Error running test:", error);
  process.exit(1);
});
