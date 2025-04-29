import { Effect } from "effect";
import { AssertionHelperApi } from "./api.js";

/**
 * Implementation of the AssertionHelperService using Effect.Service pattern.
 * Provides helper functions for making assertions in tests.
 */
export class AssertionHelperService extends Effect.Service<AssertionHelperApi>()(
  "AssertionHelperService",
  {
    effect: Effect.succeed({
      /**
       * Runs an Effect within the test harness context and asserts that it fails
       * with an error matching the specified error class.
       *
       * @param effect The Effect to run.
       * @param errorClass The constructor of the expected error class.
       * @returns A Promise that resolves if the assertion passes, or rejects if
       *   the Effect succeeds or fails with a different error.
       */
      expectError: <A, E extends Error>(
        effect: Effect.Effect<A, E, any>,
        errorClass: new (...args: any[]) => E
      ): Promise<void> => {
        // Use a simple try/catch approach with Effect.runPromise
        // This avoids the environment type issues
        return new Promise<void>((resolve, reject) => {
          // Run the effect as a promise
          // Use a type assertion to handle the environment type
          // This is safe because we're just running the effect and don't care about the environment
          Effect.runPromise(effect as Effect.Effect<A, E, never>)
            .then((result) => {
              // Effect succeeded, but we expected it to fail
              reject(
                new Error(
                  `Expected effect to fail with ${errorClass.name}, but it succeeded with: ${JSON.stringify(result)}`
                )
              );
            })
            .catch((error) => {
              // Check if the error is of the expected type
              if (error instanceof errorClass) {
                // Assertion passed
                resolve();
              } else {
                // Error is of the wrong type
                reject(
                  new Error(
                    `Expected effect to fail with ${errorClass.name}, but it failed with: ${error instanceof Error ? error.message : String(error)}`
                  )
                );
              }
            });
        });
      }
    }),
    dependencies: [],
  }
) {}

export default AssertionHelperService;
