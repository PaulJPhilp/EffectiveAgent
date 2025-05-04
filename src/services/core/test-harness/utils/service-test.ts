/**
 * @file Service test harness utility
 * @module services/core/test-harness/utils/service-test
 */

import { Context, Effect, Layer } from "effect";

/**
 * Creates a test harness for testing Effect services.
 * 
 * @param ServiceTag - The Context.Tag for the service being tested
 * @param createTestImpl - Function that creates a test implementation of the service
 * @returns A test harness object with utilities for running tests
 */
export function createServiceTestHarness<S, R>(
    ServiceTag: Context.Tag<S, S>,
    createTestImpl: () => Effect.Effect<S, never, R>
) {
    const TestLayer = Layer.effect(
        ServiceTag,
        createTestImpl()
    );

    return {
        TestLayer,

        /**
         * Runs a test effect that expects success
         */
        runTest: <A, E>(effect: Effect.Effect<A, E>) =>
            Effect.runPromise(
                effect.pipe(
                    Effect.provide(TestLayer)
                )
            ),

        /**
         * Runs a test effect and expects a specific error
         */
        expectError: (effect: Effect.Effect<any, any>, errorTag: string) =>
            Effect.gen(function* () {
                const result = yield* Effect.runPromiseExit(
                    effect.pipe(
                        Effect.provide(TestLayer)
                    )
                );

                if (!Effect.isFailure(result)) {
                    throw new Error(`Expected error with tag ${errorTag} but got success`);
                }

                const error = result.cause.failures[0];
                if (error.name !== errorTag) {
                    throw new Error(
                        `Expected error with tag ${errorTag} but got ${error.name}`
                    );
                }
            })
    };
} 