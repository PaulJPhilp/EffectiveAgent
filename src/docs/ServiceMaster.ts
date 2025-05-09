// This file is an example of the Effect.Service pattern and should not be modified by AI agents unless explicitly instructed.
import { Effect } from "effect";
import type { Either } from "effect";
import type { Exit } from "effect";

/**
 * API for the ServiceMaster.
 * Defines the interface for running Effects in different ways.
 */
export interface ServiceMasterApi {
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
    runEither: <E, A>(effect: Effect.Effect<A, E>) => Effect.Effect<Either<E, A>>;

    /**
     * Runs an Effect and returns its result wrapped in an Exit.
     * Captures success, failure, and interruption.
     *
     * @template E Error type
     * @template A Value type
     * @param effect The Effect to run.
     * @returns An Effect that will produce an Exit<E, A>.
     */
    runExit: <E, A>(effect: Effect.Effect<A, E>) => Effect.Effect<Exit<E, A>>;

    /**
     * Runs an Effect synchronously, returning the success value A.
     * Throws an exception if the Effect fails.
     * Use with caution, primarily when failure is unexpected or handled elsewhere.
     * 
     * @template E Error type
     * @template A Value type
     * @param effect The Effect to run.
     * @returns The success value A, or throws an exception.
     */
    unsafeRunSync: <E, A>(effect: Effect.Effect<A, E>) => A;
}

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
 * Implementation of the ServiceMaster using Effect.Service pattern.
 * Provides utilities for running Effects in different ways.
 */
export class ServiceMaster extends Effect.Service<ServiceMasterApi>()(
    "ServiceMaster",
    {
        effect: Effect.succeed({
            runEither: <E, A>(effect: Effect.Effect<A, E>): Effect.Effect<Either<E, A>> =>
                Effect.map(Effect.either(effect), swapEither),

            runExit: <E, A>(effect: Effect.Effect<A, E>): Effect.Effect<Exit<E, A>> =>
                Effect.map(Effect.exit(effect), swapExit),

            unsafeRunSync: <E, A>(effect: Effect.Effect<A, E>): A =>
                Effect.runSync(effect),
        }),
        dependencies: [],
    }
) { }

export default ServiceMaster; 