import { Effect } from "effect";
import { AssertionHelperApi } from "./api.js";

const assertionHelperServiceImplObject = {
  expectError: <A, E extends Error>(
    effect: Effect.Effect<A, E, any>,
    errorClass: new (...args: any[]) => E
  ): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      Effect.runPromise(effect as Effect.Effect<A, E, never>)
        .then((result) => {
          reject(
            new Error(
              `Expected effect to fail with ${errorClass.name}, but it succeeded with: ${JSON.stringify(result)}`
            )
          );
        })
        .catch((error) => {
          if (error instanceof errorClass) {
            resolve();
          } else {
            reject(
              new Error(
                `Expected effect to fail with ${errorClass.name}, but it failed with: ${error instanceof Error ? error.message : String(error)}`
              )
            );
          }
        });
    });
  }
};

export type AssertionHelperServiceImplementation = typeof assertionHelperServiceImplObject;

/**
 * Implementation of the AssertionHelperService using Effect.Service pattern.
 * Provides helper functions for making assertions in tests.
 */
export class AssertionHelperService extends Effect.Service<AssertionHelperApi>()(
  "AssertionHelperService",
  {
    effect: Effect.succeed(assertionHelperServiceImplObject),
    dependencies: [],
  }
) { }

export default AssertionHelperService;
