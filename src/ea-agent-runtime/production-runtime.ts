/**
 * @file Main AgentRuntime service that handles initialization
 * @module agent-runtime/runtime
 */

import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer, LogLevel, Logger } from "effect";
import { bootstrap } from "./bootstrap.js";
import InitializationService from "./initialization.js";
import { AgentRuntimeService } from "./service.js";

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

const runtimeLayer = Layer.merge(
  NodeFileSystem.layer,
  Logger.minimumLogLevel(LogLevel.Info)
);

export async function runWithAgentRuntime<R, E, A>(
  effect: Effect.Effect<A, E, R>
): Promise<A> {
  try {
    // Run effect with runtime services
    return await Effect.runPromise(
      Effect.gen(function* (_) {
        // Bootstrap configuration
        const masterConfig = bootstrap();

        // Set up agent runtime service
        const result = yield* Effect.provide(
          effect,
          Layer.merge(
            AgentRuntimeService.Default,
            Layer.merge(InitializationService.Default, runtimeLayer)
          )
        );

        yield* Effect.logInfo("Agent runtime initialized");
        return result;
      })
    );
  } catch (error) {
    throw new AgentRuntimeError(
      "Failed to run effect with runtime",
      "agent-runtime",
      "runWithAgentRuntime",
      error
    );
  }
}

// Alias for backwards compatibility
export const runWithAgentRuntimePromise = runWithAgentRuntime;

// For testing
export function getAgentRuntime(): Promise<never> {
  throw new Error("getAgentRuntime is deprecated - use runWithAgentRuntime instead");
}