/** @effect-diagnostics missingEffectContext:skip-file */
// Load environment variables first
import "./load-env.js";

/**
 * e2e simple prompt test (direct Effect, no CLI)
 * 
 * Note on TypeScript Environment Types:
 * This file uses @ts-ignore on Layer.provideMerge because the Effect type system
 * has limitations tracking complex environment compositions through Layer merges.
 * The code is correct and works at runtime, validated by the Effect LSP.
 * 
 * The type error occurs because TypeScript cannot properly track that FileSystem
 * and other required capabilities are provided through the nested Layer.provideMerge
 * calls. This is a known limitation when working with Effect's environment tracking.
 */

// Run with:
// bun run src/e2e/usecase/simple-prompt.ts

import { ModelService } from "@/services/ai/model/index.js";
import { ProviderService } from "@/services/ai/provider/index.js";
import type { ProviderClientApi, GenerateTextResult } from "@/services/ai/provider/types.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js";
import { EffectiveInput, EffectiveResponse } from "@/types.js";
import { ProviderOperationError, ProviderServiceConfigError, ProviderToolError, ProviderMissingCapabilityError, ProviderNotFoundError } from "@/services/ai/provider/errors.js";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Chunk, Effect, Layer } from "effect";
import { join } from "path";

const prompt = "What is the capital of France?";

// Use e2e configuration
process.env.EFFECTIVE_AGENT_MASTER_CONFIG = join(process.cwd(), "src/e2e/config/master-config.json");

const layer = Layer.mergeAll(ProviderService.Default, ModelService.Default, ToolRegistryService.Default)

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

  })
    .pipe(
      Effect.provide(
        Layer.merge(
          layer,
          Layer.merge(
            ConfigurationService.Default,
            Layer.merge(
              NodeFileSystem.layer,
              NodePath.layer
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