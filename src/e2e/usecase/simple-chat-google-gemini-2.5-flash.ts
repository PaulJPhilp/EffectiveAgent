/** @effect-diagnostics missingEffectContext:skip-file */
// Load environment variables first
import "./load-env.js";

// e2e simple prompt test (direct Effect, no CLI)
// Run with:
// bun run src/e2e/usecase/simple-prompt.ts

import { ModelService } from "@/services/ai/model/index.js";
import { ProviderService } from "@/services/ai/provider/index.js";
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js";
import type { ProviderClientApi, ChatResult, GenerateTextResult } from "@/services/ai/provider/types.js";
import { EffectiveMessage } from "@/schema.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { ProviderOperationError, ProviderServiceConfigError, ProviderToolError } from "@/services/ai/provider/errors.js";
import { EffectiveInput, EffectiveResponse } from "@/types.js";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Chunk, Effect, Layer } from "effect";
import { FileSystem } from "@effect/platform/FileSystem";
import { Path } from "@effect/platform/Path";
import { join } from "path";

const prompts = [
  "Let's have a conversation about France. What is the capital of France?",
  "What is the population?",
  "What famous museum?"
];

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
Effect.runPromise<Chunk.Chunk<EffectiveMessage>, ProviderOperationError | ProviderServiceConfigError | ProviderToolError>(
  Effect.gen(function* () {
    // Get required services
    const providerService = yield* ProviderService;
    yield* Effect.logInfo("Getting Google provider client");
    const client: ProviderClientApi = yield* providerService.getProviderClient("google");

    // Initialize empty message history
    let messages = Chunk.empty();

    // Have a 3-turn conversation
    for (const prompt of prompts) {
      yield* Effect.logInfo(`Asking: ${prompt}`);
      const input = new EffectiveInput(prompt, messages);
      const result = yield* client.chat(input, {
        modelId: "gemini-2.5-flash",
        tools: [] // Empty tools to satisfy type system
      });

      console.log("Response:", result.data.text);
      
      // Add the new message to history if present
      if (result.effectiveMessage._tag === "Some") {
        messages = Chunk.append(messages, result.effectiveMessage.value);
      }
    }

    return messages;
  }).pipe(
    // @ts-ignore - FileSystem dependency is properly provided via Layer.provideMerge
    Effect.provide(
      Layer.provideMerge(
        ProviderService.Default,
        Layer.provideMerge(
          ModelService.Default,
          Layer.provideMerge(
            ToolRegistryService.Default,
            Layer.provideMerge(
              ConfigurationService.Default,
              Layer.provideMerge(
                NodeFileSystem.layer,
                NodePath.layer
              )
            )
          )
        )
      )
    ),
    Effect.tapError((error) => Effect.sync(() => console.error("Error:", error))),
    Effect.catchAll((error) => Effect.sync(() => {
      console.error('Error:', error);
      process.exit(1);
    }))
  )
);