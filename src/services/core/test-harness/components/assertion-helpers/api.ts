import type { Effect } from "effect";

/**
 * Defines the API for assertion helper functions within the test harness.
 */
export interface AssertionHelperApi {
  /**
   * Runs an Effect within the test harness context and asserts that it fails
   * with an error matching the specified error class.
   *
   * @param effect The Effect to run.
   * @param errorClass The constructor of the expected error class.
   * @returns A Promise that resolves if the assertion passes, or rejects if
   *   the Effect succeeds or fails with a different error.
   */
  expectError<A, E extends Error>(
    effect: Effect.Effect<A, E, any>,
    errorClass: new (...args: any[]) => E
  ): Promise<void>;
}
