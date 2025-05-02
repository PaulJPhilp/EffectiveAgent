import type { Either } from "effect/Either";
import type { Exit } from "effect/Exit";
import { Effect } from "effect";

/**
 * Defines the API for Effect runner functions within the test harness.
 */
export interface EffectRunnerApi {
  /**
   * Runs an Effect and returns its result wrapped in an Either.
   * On success, returns Either.Right<A>.
   * On failure, returns Either.Left<E>.
   *
   * @template E Error type (Left)
   * @template A Value type (Right)
   * @param effect The Effect to run.
   * @returns An Effect that will produce an Either<E, A>.
   */
  runEither: <A, E>(effect: Effect.Effect<A, E>) => Effect.Effect<Either<E, A>>;

  /**
   * Runs an Effect and returns its result wrapped in an Exit.
   * Captures success, failure, and interruption.
   *
   * @template E Error type
   * @template A Value type
   * @param effect The Effect to run.
   * @returns An Effect that will produce an Exit<E, A>.
   */
  runExit: <A, E>(effect: Effect.Effect<A, E>) => Effect.Effect<Exit<E, A>>;

  /**
   * Runs an Effect synchronously, returning the success value A.
   * Throws an exception if the Effect fails.
   * Use with caution, primarily when failure is unexpected or handled elsewhere.
   * @param effect The Effect to run.
   * @returns The success value A, or throws an exception.
   */
  unsafeRunSync: <E, A>(effect: Effect.Effect<A, E>) => A;
}
