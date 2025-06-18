#!/usr/bin/env bun

/**
 * Test script to verify provider initialization and method availability
 */

import type { ProviderServiceApi } from "@/services/ai/provider/api.js";
import { ProviderNotFoundError, ProviderOperationError, ProviderServiceConfigError } from "@/services/ai/provider/errors.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import type { ConfigurationServiceApi } from "@/services/core/configuration/api.js";
import { ConfigParseError, ConfigReadError, ConfigValidationError } from "@/services/core/configuration/errors.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { NodeFileSystem, NodePath, NodeTerminal } from "@effect/platform-node";
import type * as Path from "@effect/platform/Path";
import type * as Terminal from "@effect/platform/Terminal";
import { Effect, Layer } from "effect";

// Set up environment for test
process.env.PROJECT_ROOT = process.env.PROJECT_ROOT || "/Users/paul/Projects/EffectiveAgent/test-project";
process.env.GOOGLE_API_KEY = "test-key";

// Create base services layer
const runtimeLayer = Layer.merge(
  ConfigurationService.Default,
  Layer.merge(
    NodeFileSystem.layer,
    NodePath.layer,
    NodeTerminal.layer
  )
).pipe(
  Layer.provide(ProviderService.Default)
);

type RuntimeServices = ProviderServiceApi & ConfigurationServiceApi & FileSystem & Path.Path & Terminal.Terminal;

type RuntimeError = ConfigReadError | ConfigParseError | ConfigValidationError | ProviderServiceConfigError | ProviderNotFoundError | ProviderOperationError;

// Test program
const program: Effect.Effect<void, RuntimeError, RuntimeServices> = Effect.gen(function* (_) {
  yield* Effect.logInfo("Running provider init test...");
  const providerService = yield* ProviderService;
  const googleClient = yield* providerService.getProviderClient("google");
  yield* Effect.logInfo("Got google client", { googleClient });
  return void 0;
});

const withDeps: Effect.Effect<void, RuntimeError, never> = program.pipe(
  Effect.catchAll((error: RuntimeError) => {
    if (error instanceof ConfigReadError ||
      error instanceof ConfigParseError ||
      error instanceof ConfigValidationError) {
      console.error("Configuration error:", error);
    } else if (error instanceof ProviderServiceConfigError ||
      error instanceof ProviderNotFoundError ||
      error instanceof ProviderOperationError) {
      console.error("Provider error:", error);
    } else {
      console.error("Test failed:", error);
    }
    return Effect.fail(error);
  }),
  Effect.provide(runtimeLayer)
);

Effect.runPromise(withDeps).then(() => {
  console.log("Test completed successfully");
  process.exit(0);
}).catch(() => {
  process.exit(1);
});
