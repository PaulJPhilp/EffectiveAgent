import { Effect } from "effect";
import { Tracer } from "effect/Tracer";
import { FixtureApi } from "./api.js";

/**
 * Implementation of the FixtureService using Effect.Service pattern.
 * Provides standard fixtures for use in test scenarios.
 */
export class FixtureService extends Effect.Service<FixtureApi>()(
  "FixtureService",
  {
    effect: Effect.gen(function* () {
      // Create a mock span using Effect's tracing capabilities
      const mockSpan = yield* Effect.withSpan("mock-span")(Effect.succeed(null));
      
      return {
        /**
         * Provides a standard mock tracing span.
         * Useful for testing components that interact with tracing or require a span context.
         */
        mockSpan,
        
        // Add other common fixtures here as needed
      };
    }),
    dependencies: [],
  }
) {}

export default FixtureService;
