import type { Context } from "@effect/data/Context";
import type { Effect } from "@effect/io/Effect";

/**
 * Defines the API for managing the Effect Context within the test harness.
 * This might include methods for providing layers or specific services.
 */
export interface ContextApi {
  // Placeholder for context management methods
  // Example: provideLayer: <R, E, A>(layer: Layer<R, E, A>) => Effect<void, never, TestHarnessApi>;
  // Example: getContext: () => Effect<Context<unknown>, never, never>;
}
