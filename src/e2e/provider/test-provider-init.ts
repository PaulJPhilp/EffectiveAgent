#!/usr/bin/env bun

/**
 * Test script to verify provider initialization and method availability
 */

import { NodeFileSystem } from "@effect/platform-node";
import { NodePath } from "@effect/platform-node";
import { NodeTerminal } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import {
  ConfigParseError,
  ConfigReadError,
  ConfigValidationError,
} from "@/services/core/configuration/errors.js";
import {
  ProviderNotFoundError,
  ProviderOperationError,
  ProviderServiceConfigError,
} from "@/services/ai/provider/errors.js";

// Set up environment for test
process.env.PROJECT_ROOT = process.env.PROJECT_ROOT || "/Users/paul/Projects/EffectiveAgent/test-project";
process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "test-key";

// Compose test layers
const testLayer = Layer.provideMerge(
  ProviderService.Default,
  Layer.provideMerge(
    ConfigurationService.Default,
    Layer.provideMerge(
      NodeFileSystem.layer,
      Layer.provideMerge(
        NodePath.layer,
        NodeTerminal.layer
      )
    )
  )
);

// Define test program
const testProgram = Effect.gen(function* () {
  // Get provider service
  const provider = yield* ProviderService;
  
  // Run test
  yield* Effect.logInfo("Running provider init test...");
  const googleClient = yield* provider.getProviderClient("google");
  yield* Effect.logInfo("Got google client");
  
  return Effect.void;
});

// Add error handling
const withErrorHandling = testProgram.pipe(
  Effect.catchAll((error) => Effect.gen(function* () {
    if (error instanceof ConfigReadError ||
        error instanceof ConfigParseError ||
        error instanceof ConfigValidationError) {
      yield* Effect.logError(`Configuration error: ${error.message}`);
      return Effect.fail(error);
    } 
    if (error instanceof ProviderServiceConfigError ||
        error instanceof ProviderNotFoundError ||
        error instanceof ProviderOperationError) {
      yield* Effect.logError(`Provider error: ${error.message}`);
      return Effect.fail(error);
    }
    yield* Effect.logError(`Test failed: ${error}`);
    return Effect.fail(error);
  }))
);

// Run test with dependencies
Effect.runPromise(
  withErrorHandling.pipe(
    Effect.provide(testLayer)
  )
).then(() => {
  console.log("Test completed successfully");
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
