import { Effect } from "effect";
import type { Either } from "effect";
import type { Exit } from "effect";
import type { ImportedType } from "./api.js";

// Helper function to swap the generic parameters in Either
const swapEither = <E, A>(either: Either<A, E>): Either<E, A> => {
  if (either._tag === "Left") {
    return { _tag: "Right", right: either.left } as Either<E, A>;
  } else {
    return { _tag: "Left", left: either.right } as Either<E, A>;
  }
};

// Helper function to swap the generic parameters in Exit
const swapExit = <E, A>(exit: Exit<A, E>): Exit<E, A> => {
  return exit as unknown as Exit<E, A>; // Type assertion for simplicity in scaffold
};

/**
 * Implementation of the EffectRunnerService using Effect.Service pattern.
 * Provides utilities for running Effects in different ways within the test
 * harness.
 */
export class EffectRunnerService extends Effect.Service<EffectRunnerApi>()(
  "EffectRunnerService",
  {
    effect: Effect.succeed({
      runEither: <A, E>(effect: Effect.Effect<A, E>): Effect.Effect<Either<E, A>> =>
        Effect.map(Effect.either(effect), swapEither),

      runExit: <A, E>(effect: Effect.Effect<A, E>): Effect.Effect<Exit<E, A>> =>
        Effect.map(Effect.exit(effect), swapExit),

      unsafeRunSync: <E, A>(effect: Effect.Effect<A, E>): A =>
        Effect.runSync(effect),
    }),
    dependencies: [],
  }
) {}

export default EffectRunnerService;
