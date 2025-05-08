/**
 * @file Service test harness utility
 * @module services/core/test-harness/utils/service-test
 */

import { Cause, Context, Effect, Exit, Layer, Option, pipe } from "effect";

/**
 * Creates a test harness for testing Effect services.
 * 
 * @param ServiceTag - The Context.Tag for the service being tested
 * @param createTestImpl - Function that creates a test implementation of the service
 * @returns A test harness object with utilities for running tests
 */
export function createServiceTestHarness<S>(
    ServiceTag: Context.Tag<S, S>,
    createTestImpl: () => Effect.Effect<S>
) {
    const TestLayer = Layer.succeed(
        ServiceTag,
        Effect.runSync(createTestImpl())
    );

    return {
        TestLayer,

        /**
         * Runs a test effect that expects success
         */
        runTest: <A, E>(effect: Effect.Effect<A, E, S>) =>
            pipe(
                effect,
                Effect.provide(TestLayer),
                Effect.runPromise
            ),

        /**
         * Runs a test effect and expects a specific error
         */
        expectError: (effect: Effect.Effect<any, any, S>, errorTag: string) =>
            Effect.gen(function* () {
                const exit = yield* pipe(
                    effect,
                    Effect.provide(TestLayer),
                    Effect.exit
                );

                if (!Exit.isFailure(exit)) {
                    throw new Error(`Expected error with tag ${errorTag} but got success`);
                }

                const error = Cause.failureOption(exit.cause);
                if (Option.isNone(error)) {
                    throw new Error(`Expected error but got none`);
                }

                const failure = error.value as { name: string };
                if (failure.name !== errorTag) {
                    throw new Error(
                        `Expected error with tag ${errorTag} but got ${failure.name}`
                    );
                }
            })
    };
}