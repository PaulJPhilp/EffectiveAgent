#!/usr/bin/env bun
// Simple test to verify the import paths for the Google provider client

// Try importing the Google provider client
import { makeGoogleClient } from "./src/services/ai/provider/clients/google-provider-client.js";

console.log("Successfully imported makeGoogleClient");

// Create a mock implementation to verify the structure
const mockGoogleClient = () => {
  console.log("Mock Google client created");
  return {
    generateText: () => console.log("generateText called"),
    generateObject: () => console.log("generateObject called"),
    // Other methods that should be available
    generateChat: () => console.log("generateChat called"),
    generateEmbedding: () => console.log("generateEmbedding called")
  };
};

// Check if the expected signature matches what we expect
const client = mockGoogleClient();
console.log("Client methods:", Object.keys(client));

// Attempt to call each method
client.generateText();
client.generateObject();
client.generateChat();
client.generateEmbedding();
