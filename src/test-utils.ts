/**
 * Shared test utilities for EffectiveAgent
 * 
 * This module provides common test helpers, mocks, and utilities
 * for testing Effect-based services and components.
 */

import { Context, Effect, Fiber, Layer, Runtime } from "effect"

/**
 * Run an Effect and get the result
 * 
 * @param tag - The Context tag to extract from the Effect
 * @param layer - The layer to provide to the Effect
 * @returns The result of the Effect
 */
export const runAndGet = async <E, A, T>(tag: Context.Tag<T, T>, layer: Layer.Layer<T, E, never>): Promise<T> => {
    const runtime = await Effect.runPromise(Layer.toRuntime(layer))
    return Runtime.runSync(runtime)(Effect.succeed(Context.get(tag)))
}

/**
 * Run an effect with a timeout
 * 
 * @param effect - The Effect to run
 * @param timeoutMs - The timeout in milliseconds
 * @returns The result of the Effect or throws a timeout error
 */
export const runWithTimeout = <A, E>(effect: Effect.Effect<A, E>, timeoutMs: number = 5000): Promise<A> => {
    return new Promise<A>((resolve, reject) => {
        let fiber: Fiber.RuntimeFiber<A, E>

        const timeoutId = setTimeout(() => {
            Effect.runFork(Fiber.interrupt(fiber))
            reject(new Error(`Test timed out after ${timeoutMs}ms`))
        }, timeoutMs)

        fiber = Effect.runFork(
            Effect.tap(effect, (result) => {
                clearTimeout(timeoutId)
                resolve(result)
                return Effect.void
            })
        )

        Effect.runFork(
            Effect.tap(
                Fiber.await(fiber),
                (exit) => {
                    clearTimeout(timeoutId)
                    if (exit._tag === "Failure") {
                        reject(exit.cause)
                    }
                    return Effect.void
                }
            )
        )
    })
}

/**
 * Creates a mock implementation of a service
 * 
 * @param tag - The Context tag for the service
 * @param implementation - The mock implementation
 * @returns A Layer that provides the mocked service
 */
export const createMockLayer = <T, E>(tag: Context.Tag<T, T>, implementation: T): Layer.Layer<T, E, never> => {
    return Layer.succeed(tag, implementation)
}

/**
 * Utility to run a parameterized test with Effect
 * 
 * @param testCases - Array of test cases
 * @param testFn - Function that takes a test case and returns an Effect
 * @param layer - The layer to provide to each Effect
 */
export const testEach = <C, A, E, R>(
    testCases: C[],
    testFn: (testCase: C) => Effect.Effect<A, E, R>,
    layer: Layer.Layer<R, E, never>
): Promise<A[]> => {
    return Promise.all(
        testCases.map(testCase =>
            Effect.runPromise(Effect.provide(testFn(testCase), layer))
        )
    )
}