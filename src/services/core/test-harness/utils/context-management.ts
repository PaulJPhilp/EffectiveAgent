/**
 * Utilities for managing Effect context in tests.
 * 
 * These utilities make it easier to work with Effect context in tests,
 * including creating mock services, providing dependencies, and managing
 * the lifecycle of test resources.
 */

import { Effect, Context, Layer, pipe } from "effect";

/**
 * Creates a Layer that provides a mock service.
 * 
 * @param tag - The Context.Tag for the service
 * @param implementation - The mock implementation of the service
 * @returns A Layer that provides the mock service
 */
export function mockService<I, A>(
  tag: Context.Tag<I, A>,
  implementation: A
): Layer.Layer<I> {
  return Layer.succeed(tag, implementation);
}

/**
 * Creates a Layer that provides a mock service from a factory function.
 * 
 * @param tag - The Context.Tag for the service
 * @param factory - A function that returns the mock implementation of the service
 * @returns A Layer that provides the mock service
 */
export function createMockLayer<I, A>(
  tag: Context.Tag<I, A>,
  factory: () => A
): Layer.Layer<I> {
  return Layer.effect(tag, Effect.sync(factory));
}

/**
 * Manages resource lifecycle (setup, use, teardown).
 * 
 * @param setup - An Effect that creates the resource
 * @param teardown - A function that takes the resource and returns an Effect that cleans it up
 * @returns A function that takes a use function and returns an Effect that manages the resource lifecycle
 */
export function withResource<R, E, A, B>(
  setup: Effect.Effect<A, E, R>,
  teardown: (a: A) => Effect.Effect<unknown, any, never>
): (
  use: (a: A) => Effect.Effect<B, E, R>
) => Effect.Effect<B, E, R> {
  return (use) =>
    Effect.acquireUseRelease(
      setup,
      use,
      (resource) => Effect.orDie(teardown(resource))
    );
}

/**
 * Provides a mock service to an Effect.
 * 
 * @param self - The Effect to provide the mock service to
 * @param tag - The Context.Tag for the service
 * @param implementation - The mock implementation of the service
 * @returns An Effect with the mock service provided
 */
export function provideMockService<A, E, R, I, S>(
  self: Effect.Effect<A, E, R>,
  tag: Context.Tag<I, S>,
  implementation: S
): Effect.Effect<A, E, Exclude<R, I>> {
  return pipe(
    self,
    Effect.provideService(tag, implementation)
  );
}

/**
 * Provides multiple mock services to an Effect.
 * 
 * @param self - The Effect to provide the mock services to
 * @param mocks - The mock services to provide, as an array of [tag, implementation] tuples
 * @returns An Effect with the mock services provided
 */
export function provideMockServices<A, E, R>(
  self: Effect.Effect<A, E, R>,
  ...mocks: Array<[Context.Tag<any, any>, any]>
): Effect.Effect<A, E, any> {
  return mocks.reduce(
    (effect, [tag, implementation]) =>
      provideMockService(effect, tag, implementation),
    self
  );
}
