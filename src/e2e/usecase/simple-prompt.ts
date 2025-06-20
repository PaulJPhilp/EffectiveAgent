// Load environment variables first
import "./load-env.js";

// e2e simple prompt test (direct Effect, no CLI)
// Run with:
// bun run src/e2e/usecase/simple-prompt.ts

import { ModelService } from "@/services/ai/model/index.js";
import { ProviderService } from "@/services/ai/provider/index.js";
import { ToolRegistryService } from "@/services/ai/tool-registry/index.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { EffectiveInput } from "@/types.js";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import type { ProviderClientApi } from "@/services/ai/provider/types.js";
import { Chunk, Effect } from "effect";
import { join } from "path";

const prompt = "What is the capital of France?";

// Use e2e configuration
process.env.EFFECTIVE_AGENT_MASTER_CONFIG = join(process.cwd(), "src/e2e/config/master-config.json");

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// IMPORTANT: DO NOT MODIFY THE LAYER STRUCTURE BELOW
// Effect Service Pattern for Tests:
// 1. Create base layers for system dependencies (FileSystem)
// 2. Create configuration layer that depends on FileSystem
// 3. Create provider layer that depends on both configuration and FileSystem
// 4. Use Effect.gen to yield services and make API calls
// 5. Provide all layers in correct dependency order via Effect.provide

// IMPORTANT: The Google provider is the correct provider for this test.
// The provider client from getProviderClient("google") exposes generateText
// which is the correct method to use. The chat method is not available.

// Run the test with all dependencies provided
// Run the program with all dependencies
Effect.runPromise(
  Effect.gen(function* (_) {
    // Get required services
    const providerService = yield* ProviderService;
    yield* Effect.logInfo("Getting Google provider client");
    const client: ProviderClientApi = yield* providerService.getProviderClient("google");

    // Create input and call generateText
    const input = new EffectiveInput(prompt, Chunk.empty());
    const result = yield* client.generateText(input, {
      modelId: "gemini-2.0-flash",
      system: "You are a helpful assistant that provides accurate, factual answers."
    });

    console.log("Response:", result);
    return result;
  }).pipe(
    Effect.provide(ToolRegistryService.Default),
    Effect.provide(ModelService.Default),
    Effect.provide(ProviderService.Default),
    Effect.provide(ConfigurationService.Default),
    Effect.provide(NodePath.layer),
    Effect.provide(NodeFileSystem.layer),
    Effect.tapError((error) => Effect.sync(() => console.error("Error:", error))),
    Effect.catchAll((error) => {
      console.error('Error:', error);
      process.exit(1);
      return Effect.succeed(void 0);
    })
  )
);