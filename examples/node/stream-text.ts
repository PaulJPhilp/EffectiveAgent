#!/usr/bin/env tsx

/**
 * Node.js example demonstrating text streaming with effect-ai-sdk
 */

import { createProvider } from "@effective-agent/ai-sdk";
import { streamText } from "@effective-agent/ai-sdk";

// Initialize provider (requires OPENAI_API_KEY environment variable)
const provider = createProvider("openai");
const model = provider.languageModel("gpt-4o-mini");

async function main() {
  console.log("🚀 Streaming text example\n");

  const messages = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Write a short story about a robot learning to paint." }
  ];

  const streamHandle = streamText(model, {
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages,
  });

  console.log("📝 Streaming response:\n");

  let fullText = "";

  // Option 1: Use the readable stream directly
  const reader = streamHandle.readable.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      switch (value.type) {
        case "token-delta":
          process.stdout.write(value.delta);
          fullText += value.delta;
          break;
        case "final-message":
          console.log("\n\n✅ Final message received");
          break;
        case "complete":
          console.log("🎉 Stream completed");
          break;
        case "error":
          console.error("❌ Error:", value.error);
          break;
      }
    }
  } finally {
    reader.releaseLock();
  }

  console.log("\n\n📊 Full text collected:");
  console.log(await streamHandle.collectText());
  console.log("\n✨ Example completed!");
}

main().catch(console.error);
