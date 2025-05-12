import { Cause, Effect, Exit, Layer, Option, Runtime, Scope } from "effect"
import { TestHarnessApi } from "../api.js"
import { AssertionHelperService } from "../components/assertion-helpers/service.js"
import { EffectRunnerService } from "../components/effect-runners/service.js"
import { FixtureService } from "../components/fixtures/service.js"
import { MockAccessorService } from "../components/mock-accessors/service.js"

/**
 * Service test harness interface
 */
export interface ServiceTestHarness {
    readonly runTest: <A, E, R_Test>(effect: Effect.Effect<A, E, R_Test>) => Promise<A>
    readonly runFailTest: <A, E, R_Test>(effect: Effect.Effect<A, E, R_Test>) => Promise<Exit.Exit<A, E>>
    readonly expectError: <A, E, R_Test>(effect: Effect.Effect<A, E, R_Test>, errorTag: string) => Promise<void>
    readonly harness: TestHarnessApi
}

/**
 * Creates a test harness for testing Effect-based services.
 * @param layer - The Layer providing the service implementation
 */
export function createServiceTestHarness<R, E = never>(
    layer: Layer.Layer<R, E, never>
): ServiceTestHarness {
    const runtimeEffect = Effect.gen(function* () {
        const scope = yield* Effect.acquireRelease(
            Scope.make(),
            scope => Scope.close(scope, Exit.unit)
        )
        const runtime = yield* Layer.toRuntime(layer).pipe(
            Effect.provideService(Scope.Scope, scope)
        )
        return runtime
    })
    const runtimePromise = Effect.runPromise(runtimeEffect)

    // Create test harness components
    const harness: TestHarnessApi = {
        runners: new EffectRunnerService(),
        assertions: new AssertionHelperService(),
        mocks: new MockAccessorService(),
        fixtures: new FixtureService(),
        context: {
            // Context management functions
            provide: <A, E, R>(effect: Effect.Effect<A, E, R>, layer: Layer.Layer<R>) =>
                Effect.provide(effect, layer),
            provideService: <A, E, R, T>(effect: Effect.Effect<A, E, R>, tag: any, implementation: T) =>
                Effect.provideService(effect, tag, implementation),
            provideMock: <A, E, R, T>(effect: Effect.Effect<A, E, R>, tag: any, mock: T) =>
                Effect.provideService(effect, tag, mock)
        }
    }

    return {
        harness,

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