import { Cause, Effect, Exit, Layer, Option, Runtime } from "effect";

/**
 * Service test harness interface
 */
export interface ServiceTestHarness {
    readonly runTest: <A, E, R_Test>(effect: Effect.Effect<A, E, R_Test>) => Promise<A>
    readonly runFailTest: <A, E, R_Test>(effect: Effect.Effect<A, E, R_Test>) => Promise<Exit.Exit<A, E>>
    readonly expectError: <A, E, R_Test>(effect: Effect.Effect<A, E, R_Test>, errorTag: string) => Promise<void>
}

/**
 * Creates a test harness for testing Effect-based services.
 * @param layer - The Layer providing the service implementation
 */
export function createServiceTestHarness<R, E = never>(
    layer: Layer.Layer<R, E, never>
): ServiceTestHarness {
    const runtimeEffect = Effect.scoped(Layer.toRuntime(layer))
    const runtimePromise = Effect.runPromise(runtimeEffect)

    return {
        runTest: async <A, E, R_Test>(effect: Effect.Effect<A, E, R_Test>) => {
            const rt = await runtimePromise
            return Runtime.runPromise(rt)(effect as unknown as Effect.Effect<A, E, R>)
        },

        runFailTest: async <A, E, R_Test>(effect: Effect.Effect<A, E, R_Test>) => {
            const rt = await runtimePromise
            return Runtime.runPromiseExit(rt)(effect as unknown as Effect.Effect<A, E, R>)
        },

        expectError: async <A, E, R_Test>(effect: Effect.Effect<A, E, R_Test>, errorTag: string) => {
            const rt = await runtimePromise
            const exit = await Runtime.runPromiseExit(rt)(effect as unknown as Effect.Effect<A, E, R>)

            if (Exit.isSuccess(exit)) {
                throw new Error(`Expected error with tag '${errorTag}' but got success.`)
            }

            const failureOption = Cause.failureOption(exit.cause)
            if (Option.isNone(failureOption)) {
                throw new Error(
                    `Expected error with tag '${errorTag}' but encountered a failure with no specific error value.`
                )
            }

            const error = failureOption.value
            const actualTag = error && typeof error === "object" && "_tag" in error
                ? (error as { _tag: unknown })._tag
                : undefined

            if (actualTag !== errorTag) {
                throw new Error(
                    `Expected error with tag '${errorTag}' but got '${actualTag ?? String(error)}'.`
                )
            }
        }
    }
} 