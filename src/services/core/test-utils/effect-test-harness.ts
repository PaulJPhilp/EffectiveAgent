/**
 * Utility for creating test harnesses for Effect-based services
 * 
 * This provides a consistent pattern for testing services with proper typing 
 * and dependency injection, avoiding common inference issues.
 */

import { ChatModelError } from "@/services/ai/index.js";
import { ModelServiceApi } from "@/services/ai/model/service.js";
import { ProviderServiceApi } from "@/services/ai/provider/api.js";
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
    const runTest = <A, E2>(effect: Effect.Effect<A, E2, any>, p0: { layer: Layer.Layer<any, any, any>; }): Promise<A> => {
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
    const expectError = async <A, E extends Error>(
        effect: Effect.Effect<A, E, any>,
        errorClass: new (...args: any[]) => E,
        options?: { layer?: Layer.Layer<any, any, any> }
    ): Promise<void> => {
        const exit = await runFailTest(effect);

        if (!Exit.isFailure(exit)) {
            throw new Error(`Expected failure, but got success: ${JSON.stringify(exit)}`);
        }

        const error = Cause.failureOrCause(exit.cause);

        if (!(error instanceof errorClass)) {
            throw new Error(`Expected error of type ${errorClass.name}, but got: ${error}`);
        }
    };

    return {
        TestLayer,
        runTest,
        runFailTest,
        expectError,
        layer: TestLayer as Layer.Layer<any, any, any>,
    };

}