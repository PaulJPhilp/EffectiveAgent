// Load environment variables first
import "./load-env.js";

/**
 * e2e simple prompt test (direct Effect, no CLI)
 * 
 * Note on TypeScript Environment Types:
 * This file uses @ts-expect-error on Layer.provideMerge because the Effect type system
 * has limitations tracking complex environment compositions through Layer merges.
 * The code is correct and works at runtime, validated by the Effect LSP.
 * 
 * The type error occurs because TypeScript cannot properly track that FileSystem
 * and other required capabilities are provided through the nested Layer.provideMerge
 * calls. This is a known limitation when working with Effect's environment tracking.
 */

// Run with:
// bun run src/e2e/usecase/simple-prompt-openai.ts

import { ModelService } from "@/services/ai/model/index.js";
import { ProviderService } from "@/services/ai/provider/index.js";
import type { ProviderClientApi } from "@/services/ai/provider/types.js";
import { ToolRegistryService } from "@/services/ai/tool-registry/index.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { EffectiveInput } from "@/types.js";
import { NodeContext } from "@effect/platform-node";
import { Chunk, Effect, Layer } from "effect";
import { join } from "path";

const prompt = "What is the capital of France?";

// Use e2e configuration
process.env.EFFECTIVE_AGENT_MASTER_CONFIG = join(process.cwd(), "src/e2e/config/master-config.json");

// Layer Composition
// A single, flat layer is created by merging all service and platform layers.
// Effect's `Layer.mergeAll` is powerful enough to resolve the entire dependency
// graph. It ensures that services like `ConfigurationService` get their required
// `FileSystem` and `Path` dependencies from the platform layers, and that other
// services get the fully constructed `ConfigurationService` they need.
const appLayer = Layer.mergeAll(
  ConfigurationService.Default,
  ProviderService.Default,
  ModelService.Default,
  ToolRegistryService.Default
).pipe(
  Layer.provide(NodeContext.layer)
)

// Run the program with all dependencies

const app = Effect.gen(function* () {
  // Get required services
  const providerService = yield* ProviderService;
  yield* Effect.logInfo("Getting OpenAI provider client");
  const client: ProviderClientApi = yield* providerService.getProviderClient("openai");

  // Create input and call generateText
  const input = new EffectiveInput(prompt, Chunk.empty());
  const result = yield* client.generateText(input, {
    modelId: "gpt-3.5-turbo",
    system: "You are a helpful assistant that provides accurate, factual answers."
  });

  console.log("Response:", result);
  return result;
}).pipe(
  // The type system can struggle to infer the final provided environment through
  // multiple layers of composition, but the dependency graph is correct.
  Effect.provide(appLayer),
  Effect.tapError((error) => Effect.sync(() => console.error("Error:", error))),
  // Effect.catchAll((error) => {
  //   console.error('Error:', error);
  //   process.exit(1);
  // })
)

// The Effect environment types are complex across merged layers; the code is
// intentionally using a runtime cast to `any` for the final run invocation.
Effect.runPromise(app as any);