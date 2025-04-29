import { type Span, Tracer } from "effect/Tracer";
import { Context, Effect, Layer } from "effect";

/**
 * Defines the API for accessing standard fixtures provided by the test harness.
 * Fixtures are pre-configured data or objects useful for setting up test scenarios.
 */
export interface FixtureApi {
  /**
   * Provides a standard mock tracing span.
   * Useful for testing components that interact with tracing or require a span context.
   */
  readonly mockSpan: Span;

  // Add other common fixtures here as needed
}
