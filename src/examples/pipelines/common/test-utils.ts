/**
 * @file Common test utilities for pipeline testing
 * @module ea/pipelines/common/test-utils
 */

import { Context, Effect, Layer } from "effect";
import { vi } from "vitest";

/**
 * Creates a type-safe mock pipeline service
 * 
 * @param ServiceTag - Context tag for the service
 * @param implementation - Mock implementation of the service
 * @returns A Layer that provides the mock service
 */
export function mockPipelineService<S extends Context.Tag<any, any>>(
    ServiceTag: S,
    implementation: Context.Tag.Service<S>
): Layer.Layer<Context.Tag.Identifier<S>> {
    return Layer.succeed(ServiceTag, implementation);
}

/**
 * Creates a pipeline test environment with timing measurements
 * 
 * @param fn - Test function that uses the environment
 * @returns A function that runs the test with timing info
 */
export function withTiming<T>(
    fn: () => Promise<T>
): () => Promise<{ result: T; executionTimeMs: number }> {
    return async () => {
        const startTime = Date.now();
        const result = await fn();
        const endTime = Date.now();
        return {
            result,
            executionTimeMs: endTime - startTime
        };
    };
}

/**
 * Creates a spy on a service method that tracks calls and can be reset
 * 
 * @param service - Service object to spy on
 * @param methodName - Name of the method to spy on
 * @returns A spied version of the service with the spy object
 */
export function spyOnServiceMethod<S, M extends keyof S>(
    service: S,
    methodName: M & string
): { service: S; spy: ReturnType<typeof vi.spyOn> } {
    const spy = vi.spyOn(service, methodName as any);
    return { service, spy };
}

/**
 * Creates a test fixture with before/after handling
 * 
 * @param setupFn - Function to set up the fixture
 * @param teardownFn - Function to tear down the fixture
 * @returns A function that runs a test with the fixture
 */
export function createTestFixture<T>(
    setupFn: () => Promise<T>,
    teardownFn: (fixture: T) => Promise<void>
): <R>(testFn: (fixture: T) => Promise<R>) => Promise<R> {
    return async <R>(testFn: (fixture: T) => Promise<R>): Promise<R> => {
        const fixture = await setupFn();
        try {
            return await testFn(fixture);
        } finally {
            await teardownFn(fixture);
        }
    };
}

/**
 * Runs an Effect with provided layers and returns the result or error
 * 
 * @param effect - The Effect to run
 * @param layers - Layers to provide to the Effect
 * @returns The result of running the Effect
 */
export async function runEffectWithLayers<R, E, A>(
    effect: Effect.Effect<A, E, R>,
    layers: Layer.Layer<R>
): Promise<{ result?: A; error?: E }> {
    const resultOrError = await Effect.runPromise(
        Effect.either(effect.pipe(Effect.provide(layers)))
    );
    if (resultOrError._tag === "Right") {
        return { result: resultOrError.right };
    }
    return { error: resultOrError.left };
}

/**
 * Measures performance of an Effect
 * 
 * @param effect - The Effect to measure
 * @param layers - Layers to provide to the Effect
 * @returns The result and execution time
 */
export async function measureEffectPerformance<R, E, A>(
    effect: Effect.Effect<A, E, R>,
    layers: Layer.Layer<R>
): Promise<{
    result?: A;
    error?: E;
    executionTimeMs: number;
}> {
    const startTime = Date.now();
    const { result, error } = await runEffectWithLayers(effect, layers);
    const executionTimeMs = Date.now() - startTime;

    return {
        result,
        error,
        executionTimeMs
    };
}

/**
 * Creates test data for pipeline testing
 * 
 * @param overrides - Properties to override in the default test data
 * @returns Test data object
 */
export function createPipelineTestData<T extends Record<string, any>>(
    defaultData: T,
    overrides?: Partial<T>
): T {
    return { ...defaultData, ...(overrides || {}) };
}

/**
 * Adds pipeline testing types and utilities for a specific pipeline type
 * 
 * @param enableDebug - Whether to enable debug logging during tests
 * @returns Utilities scoped to the pipeline type
 */
export function createPipelineTestKit(enableDebug = false) {
    const log = (message: string, ...args: any[]): void => {
        if (enableDebug) {
            console.log(`[Pipeline Test] ${message}`, ...args);
        }
    };

    return {
        log,
        mockPipelineService,
        withTiming,
        spyOnServiceMethod,
        createTestFixture,
        runEffectWithLayers,
        measureEffectPerformance,
        createPipelineTestData
    };
}