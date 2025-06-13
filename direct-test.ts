#!/usr/bin/env bun

/**
 * Simple script to verify import resolution is working correctly
 * This won't run the provider client, just check it imports correctly
 */

import { ProviderService } from "./src/services/ai/provider/service.js";
import * as GoogleClient from "./src/services/ai/provider/clients/google-provider-client.js";

// Just log what we find to verify the imports work
console.log("✅ Successfully imported ProviderService");
console.log("Available exports from provider service:", Object.keys(ProviderService));

console.log("\n✅ Successfully imported Google provider client module");
console.log("Available exports from Google client:", Object.keys(GoogleClient));

// Check if makeGoogleClient function is exported
if (typeof GoogleClient.makeGoogleClient === "function") {
  console.log("\n✅ makeGoogleClient is a function");
} else {
  console.error("❌ makeGoogleClient is not a function");
}

// Inspect the source code of the make function to see if it defines generateObject
const makeGoogleClientSource = GoogleClient.makeGoogleClient.toString();
console.log("\nChecking makeGoogleClient source code for generateObject method:");

if (makeGoogleClientSource.includes("generateObject")) {
  console.log("✅ generateObject is defined in the makeGoogleClient source");
} else {
  console.error("❌ generateObject not found in makeGoogleClient source");
}

// Success! Our fix to add .js extensions is working
console.log("\n🎉 Import resolution is working correctly with .js extensions");
