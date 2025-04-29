import type { Span } from "effect/Tracer";
import type { EmbeddingService, EmbeddingGenerationOptions } from "@/services/ai/producers/embedding/service.js";
import type { Either } from "effect/Either";

/**
 * API surface for the Effect-based TestHarnessService.
 * Exposes all test helpers and harness utilities for use in test suites.
 */
export interface TestHarnessService {
  /**
   * A mock Span for use in tests.
   */
  mockSpan: Span;
  /**
   * Helper for use with Exit.match in Effect-based tests.
   * Throws if called (for use as onSuccess in failure-expected tests).
   *
   * @param _ - The value (ignored)
   * @throws Always throws an error indicating unexpected success.
   */
  expectFailure: (_?: unknown) => never;

  /**
   * Helper for use with Exit.match in Effect-based tests.
   * Asserts that the error message contains the given substring.
   *
   * @param error - The error value
   * @param substring - Substring to expect in error message
   */
  expectErrorContains: (error: unknown, substring: string) => void;

  /**
   * Helper to extract and assert the first text part from a chat response.
   * Throws a descriptive error if the structure is not as expected.
   *
   * @param response - The chat response object
   * @param expectedContent - The expected text content
   */
  expectFirstTextPart: (response: { role: unknown; parts: any }, expectedContent: string) => void;

  /**
   * Runs an Effect and returns an Either result for test assertions.
   */
  runEither: <A, E = unknown, R = unknown>(effect: Effect.Effect<A, E, R>) => Promise<Either<E, A>>;
}
