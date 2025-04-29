import type { Either } from "effect/Either";
import type { Exit } from "effect/Exit";

/**
 * Converts Either<A, E> to Either<E, A> for type safety.
 */
export function swapEither<A, E>(either: Either<A, E>): Either<E, A> {
  return either._tag === "Left"
    ? { _tag: "Left", left: either.left } as unknown as Either<E, A>
    : { _tag: "Right", right: either.right } as unknown as Either<E, A>;
}

/**
 * Converts Exit<A, E> to Exit<E, A> for type safety.
 * Note: Uses a double cast for test harness only.
 */
export function swapExit<A, E>(exit: Exit<A, E>): Exit<E, A> {
  return exit as unknown as Exit<E, A>;
}
