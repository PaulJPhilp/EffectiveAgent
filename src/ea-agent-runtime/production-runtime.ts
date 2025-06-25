/**
 * @file Main AgentRuntime service that handles initialization
 * @module agent-runtime/runtime
 */

import { ModelService } from "@/services/ai/model/service.js";
import { PolicyService } from "@/services/ai/policy/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js";
import { ConfigReadError, ConfigParseError, ConfigValidationError } from "@/services/core/configuration/errors.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { Logger, LogLevel } from "effect";
import { NodeFileSystem, NodePath, NodeTerminal } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { AgentRuntimeService } from "./service.js";
import type { RuntimeServices } from "./types.js";

export class AgentRuntimeError extends Error {
  constructor(
    message: string,
    readonly module: string = "agent-runtime",
    readonly method: string = "AgentRuntime",
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "AgentRuntimeError";
  }
}

export async function runWithAgentRuntime<A, E>(
  effect: Effect.Effect<A, E | ConfigReadError | ConfigParseError | ConfigValidationError, RuntimeServices>
): Promise<A> {


  // Create base services layer
  const baseLayer = Layer.mergeAll(
    ConfigurationService.Default,
    ModelService.Default,
    ProviderService.Default,
    PolicyService.Default,
    ToolRegistryService.Default,
    AgentRuntimeService.Default,
    NodeFileSystem.layer,
    NodePath.layer,
    NodeTerminal.layer,
    Logger.minimumLogLevel(LogLevel.Info)
  ) as unknown as Layer.Layer<RuntimeServices, never, never>;

  // Create and run program with all dependencies
  const withDeps = Effect.gen(function* () {
    yield* Effect.logInfo("Initializing agent runtime...");
    return yield* effect;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(`Runtime error: ${error}`);
        if (
          error instanceof ConfigReadError ||
          error instanceof ConfigParseError ||
          error instanceof ConfigValidationError
        ) {
          return yield* Effect.fail(error);
        }
        if (error instanceof Error) {
          return yield* Effect.fail(
            new AgentRuntimeError(
              error.message || "Failed to run effect with runtime",
              "agent-runtime",
              "runWithAgentRuntime",
              error
            )
          );
        }
        return yield* Effect.fail(
          new AgentRuntimeError(
            "Failed to run effect with runtime",
            "agent-runtime",
            "runWithAgentRuntime",
            error
          )
        );
      })
    )
  ).pipe(Effect.provide(baseLayer));

  // Run program
  return await Effect.runPromise(withDeps);
}



// Alias for backwards compatibility
export const runWithAgentRuntimePromise = runWithAgentRuntime;

// For testing
export function getAgentRuntime(): Promise<never> {
  throw new Error("getAgentRuntime is deprecated - use runWithAgentRuntime instead");
}