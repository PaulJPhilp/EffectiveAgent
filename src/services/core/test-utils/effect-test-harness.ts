/**
 * Utility for creating test harnesses for Effect-based services
 * 
 * This provides a consistent pattern for testing services with proper typing 
 * and dependency injection, avoiding common inference issues.
 */

import { Cause, Context, Effect, Exit, Layer } from "effect";

/**
 * Creates a test harness for an Effect service
 * 
 * @param ServiceTag - The Context.Tag for the service being tested
 * @param createTestImpl - Function that creates a test implementation
 * @param dependencyLayers - Optional layers providing dependencies needed by the service implementation
 * @returns Test harness object with utility methods
 */
export function createServiceTestHarness<Tag, S, E = never>(
    ServiceTag: Tag,
    createTestImpl: () => Effect.Effect<S, E, any>,
    dependencyLayers?: Layer.Layer<any, any, any>
) {
    // Create a Layer that provides the test implementation
    const serviceLayer = Layer.effect(
        ServiceTag as unknown as Context.Tag<unknown, unknown>,
        createTestImpl()
    );

    // Combine with dependency layers if provided
    // Use mergeAll to ensure all dependencies are available to both the service and test effects
    const TestLayer = dependencyLayers
        ? Layer.mergeAll(dependencyLayers, serviceLayer)
        : serviceLayer;

    // Helper to run tests expecting success
    const runTest = <A, E2>(effect: Effect.Effect<A, E2, any>): Promise<A> => {
        // Provide the test layer to the effect
        const providedEffect = Effect.provide(effect, TestLayer);

        // Add logging for any unexpected errors
        const effectWithLogging = providedEffect.pipe(
            Effect.catchAllCause(cause => {
                console.error("Effect Test Error:", Cause.pretty(cause));
                // Re-fail with the original cause
                return Effect.failCause(cause);
            })
        );

        // Cast to bypass the type issue - we know all dependencies are satisfied
        return Effect.runPromise(effectWithLogging as Effect.Effect<A, E | E2, never>);
    };

    // Helper to run tests expecting failure
    const runFailTest = <A, E2>(effect: Effect.Effect<A, E2, any>): Promise<Exit.Exit<A, E2>> => {
        // Provide the test layer to the effect
        const providedEffect = Effect.provide(effect, TestLayer);

        // Add logging for causes
        const effectWithLogging = providedEffect.pipe(
            Effect.catchAllCause(cause => {
                // Only log in debug mode to avoid cluttering test output
                if (process.env["DEBUG"]) {
                    console.error("Effect Test Cause:", Cause.pretty(cause));
                }
                // Re-fail with the original cause
                return Effect.failCause(cause);
            })
        );

        // Cast to bypass the type issue - we know all dependencies are satisfied
        return Effect.runPromiseExit(effectWithLogging as Effect.Effect<A, E | E2, never>) as Promise<Exit.Exit<A, E2>>;
    };

    // Helper to assert a specific error was thrown
    const expectError = async <A, E2 extends { _tag: string }>(
        effect: Effect.Effect<A, E2, any>,
        errorTag: E2["_tag"]
    ): Promise<void> => {
        const exit = await runFailTest(effect);

        if (!Exit.isFailure(exit)) {
            throw new Error(`Expected error with tag ${errorTag}, but effect succeeded`);
        }

        const failure = Cause.failureOption(exit.cause);

        if (Exit.isFailure(exit) && failure._tag === "Some") {
            const error = failure.value;
            if ("_tag" in error && error._tag === errorTag) {
                return; // Success case - error with correct tag was thrown
            }
            throw new Error(`Expected error with tag ${errorTag}, got ${("_tag" in error) ? error._tag : "unknown error"}`);
        }

        throw new Error(`Expected error with tag ${errorTag}, but got a different failure`);
    };

    return {
        TestLayer,
        runTest,
        runFailTest,
        expectError
    };
} 