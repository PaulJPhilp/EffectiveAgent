import { Effect } from "effect";
import { Exit } from "effect/Exit";
import { Either } from "effect/Either";

/**
 * Defines the API for a service that can run Effects in various ways,
 * capturing their results as Either or Exit types, or running them synchronously.
 * This is primarily useful for testing scenarios.
 */
export interface EffectRunnerApi {
  /**
   * Runs an Effect and returns its result as an Either.
   * Left indicates an error, Right indicates success.
   * The Either itself is wrapped in an Effect, allowing composition.
   */
  readonly runEither: <A, E>(
    effect: Effect.Effect<A, E>
  ) => Effect.Effect<Either<E, A>>;

  /**
   * Runs an Effect and returns its result as an Exit.
   * Exit can represent success, failure, or interruption.
   * The Exit itself is wrapped in an Effect, allowing composition.
   */
  readonly runExit: <A, E>(
    effect: Effect.Effect<A, E>
  ) => Effect.Effect<Exit<E, A>>;

  /**
   * Runs an Effect synchronously and returns its success value.
   * This will throw an error if the Effect fails or is asynchronous.
   * Use with caution, primarily for testing simple, synchronous effects.
   */
  readonly unsafeRunSync: <E, A>(effect: Effect.Effect<A, E>) => A;
}
