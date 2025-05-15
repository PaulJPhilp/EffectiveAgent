import type { ModelServiceApi } from "@/services/ai/model/api.js"
import type { ProviderServiceApi } from "@/services/ai/provider/api.js"
import { ConfigurationService, configurationServiceEffect } from "@/services/core/configuration/service.js"
import type { RepositoryServiceApi } from "@/services/core/repository/api.js"
import { RepositoryError } from "@/services/core/repository/errors.js"
import type { BaseEntity } from "@/services/core/repository/types.js"
import type { LanguageModelV1 } from "@ai-sdk/provider"
import { NodeContext } from "@effect/platform-node"
// import "@effect/vitest/register" // Removed this line as it's now in vitest.config.ts setupFiles
import { Cause, Context, Effect, Exit as EffectExit, Either, Layer, Option, Runtime } from "effect"
import { Span, SpanLink, SpanStatus } from "effect/Tracer"
import { ConfigurationServiceApi } from "../../configuration/api.js"
import { TestHarnessApi } from "../api.js"
import { AssertionHelperService, AssertionHelperServiceImplementation } from "../components/assertion-helpers/service.js"
import { EffectRunnerService, EffectRunnerServiceLive } from "../components/effect-runners/service.js"
import { FixtureService } from "../components/fixtures/service.js"
import { MockAccessorService, type MockAccessorServiceImplementation, mockAccessorServiceImplObject } from "../components/mock-accessors/service.js"

// Helper function to swap the generic parameters in Either (copied from effect-runners/service.ts)
const swapEither = <E, A>(either: Either.Either<A, E>): Either.Either<E, A> => {
    if (Either.isLeft(either)) {
        return Either.right(either.left);
    } else {
        return Either.left(either.right);
    }
};

const assertionHelperServiceImpl: AssertionHelperServiceImplementation = {
    expectError: <A, E extends Error>(
        effect: Effect.Effect<A, E, any>,
        errorClass: new (...args: any[]) => E
    ): Promise<void> => {
        return new Promise<void>((resolve, reject) => {
            Effect.runPromise(effect as Effect.Effect<A, E, never>)
                .then((result) => {
                    reject(
                        new Error(
                            `Expected effect to fail with ${errorClass.name}, but it succeeded with: ${JSON.stringify(result)}`
                        )
                    );
                })
                .catch((error) => {
                    if (error instanceof errorClass) {
                        resolve();
                    } else {
                        reject(
                            new Error(
                                `Expected effect to fail with ${errorClass.name}, but it failed with: ${error instanceof Error ? error.message : String(error)}`
                            )
                        );
                    }
                });
        });
    }
};

// Implementation for MockAccessorService (simplified for brevity, ensure full structure is copied)
const mockAccessorServiceImpl: MockAccessorServiceImplementation = {
    mockLanguageModelV1: { specificationVersion: 'v1', provider: 'mock-provider', modelId: 'mock-model', defaultObjectGenerationMode: 'json', doGenerate: async (options: any) => ({ text: "This is a mock response from the language model", finishReason: "stop", usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }, rawCall: { rawPrompt: options.messages?.[0]?.content || "", rawSettings: {} } }), doStream: async () => ({ stream: new ReadableStream(), rawCall: { rawPrompt: "", rawSettings: {} } }) } as unknown as LanguageModelV1,
    mockModelService: { load: () => Effect.succeed({ models: [], name: "mock", version: "1.0" } as any), getProviderName: (modelId: string) => Effect.succeed("mock-provider"), findModelsByCapability: () => Effect.succeed([]), findModelsByCapabilities: () => Effect.succeed([]), getDefaultModelId: () => Effect.succeed("mock-model"), getModelsForProvider: () => Effect.succeed([]), validateModel: () => Effect.succeed(true), exists: (modelId: string) => Effect.succeed(true), } as ModelServiceApi,
    mockProviderService: { load: () => Effect.succeed({ providers: [], name: "mock", description: "Mock provider file" } as any), getProviderClient: (providerName: string) => Effect.succeed({ validateToolInput: (toolName: string, input: unknown) => Effect.succeed(input), executeTool: (toolName: string, input: unknown) => Effect.succeed({ mockOutput: "tool executed" }), processToolResult: (toolName: string, result: unknown) => Effect.succeed({ mockFormated: "result processed" }), chat: (input: any, opts: any) => Effect.die("chat not mocked"), setVercelProvider: (_pVercel: any) => Effect.succeed(undefined), getProvider: () => Effect.die("getProvider not mocked"), generateText: (input: any, opts: any) => Effect.die("generateText not mocked"), generateObject: (input: any, opts: any) => Effect.die("generateObject not mocked"), generateSpeech: (input: any, opts: any) => Effect.die("generateSpeech not mocked"), transcribe: (input: any, opts: any) => Effect.die("transcribe not mocked"), generateEmbeddings: (texts: any[], opts: any) => Effect.succeed({ metadata: {}, data: { embeddings: texts.map(() => [0.1, 0.2, 0.3]), dimensions: 3, texts: texts, id: "id", model: "model", timestamp: new Date() }, usage: { promptTokens: 1, totalTokens: 1, completionTokens: 0 }, finishReason: "stop" } as any), generateImage: (input: any, opts: any) => Effect.die("generateImage not mocked"), getCapabilities: () => Effect.succeed(new Set()), getModels: () => Effect.succeed([]), getDefaultModelIdForProvider: (p: any, c: any) => Effect.succeed("id") } as any), } as ProviderServiceApi,
    mockProducerServices: {
        mockEmbeddingService: { generate: ({ modelId, text }) => Effect.succeed({ embeddings: [[0.1]], model: modelId, timestamp: new Date(), id: "id", usage: { promptTokens: 1, totalTokens: 1, completionTokens: 0 } } as any) },
        mockTextService: { generate: () => Effect.die("nyi") },
        mockImageService: { generate: () => Effect.die("nyi") },
        mockObjectService: { generate: () => Effect.die("nyi") },
        mockTranscriptionService: { transcribe: () => Effect.die("nyi") },
        mockChatService: {
            create: (options: any) => Effect.succeed({
                text: "Mock chat response",
                imageUrl: undefined,
                withToolCallsJson: undefined,
                withToolCallsUnknown: undefined,
                someOtherProperty1: undefined,
                someOtherProperty2: undefined,
                someOtherProperty3: undefined,
                someOtherProperty4: undefined,
            } as any)
        }
    },
    resetMockCallArgs: () => Effect.sync(() => {
        // Reset actual captured args here, for example:
        // capturedArgs.modelService.getProviderName = undefined;
        // capturedArgs.providerService.getProviderClient = undefined;
        // capturedArgs.providerClient.generateEmbeddings = undefined;
    }),
    getMockCapturedArgs: () => ({
        modelService: {
            getProviderName: undefined,
        },
        providerService: {
            getProviderClient: undefined,
        },
        providerClient: {
            generateEmbeddings: undefined,
        }
        // This should ideally return a reference to the actual 'capturedArgs' object
        // that is mutated by the mocked service methods.
        // For now, returning a structure that satisfies the type.
    }),
};

/**
 * Service test harness interface
 */
export interface ServiceTestHarness<R extends {} | never = never, E = any, A = any> {
    readonly runTest: (testEffect: Effect.Effect<A, E, R>) => Promise<A>
    readonly runFailTest: <A_Fail, E_Fail, R_Test_Fail extends {} | never = never>(effect: Effect.Effect<A_Fail, E_Fail, R_Test_Fail>) => Promise<EffectExit.Exit<A_Fail, E_Fail>>
    readonly expectError: <A_Expect, E_Expect, R_Test_Expect extends {} | never = never>(effect: Effect.Effect<A_Expect, E_Expect, R_Test_Expect>, errorTag: string) => Promise<void>
    readonly harness: TestHarnessApi
    readonly runTestPromise: (testEffect: Effect.Effect<A, E, R>) => Promise<A>
    readonly close: () => Promise<void>
}

/**
 * Creates a test harness for testing Effect-based services.
 * @param inputLayer - The Layer providing the service implementation for the test subject.
 */
export function createServiceTestHarness<R extends {} | never = never, E = any, A = any>(
    inputLayer: Layer.Layer<R, E, any> // Input layer requires 'any' context, R is its output
): ServiceTestHarness<R, E, A> {
    console.log("EffectRunnerService:", EffectRunnerService);
    console.log("AssertionHelperService:", AssertionHelperService);
    console.log("MockAccessorService TAG:", MockAccessorService);
    console.log("mockAccessorServiceImplObject:", typeof mockAccessorServiceImplObject, mockAccessorServiceImplObject !== undefined);
    console.log("FixtureService:", FixtureService);
    console.log("ConfigurationService TAG:", ConfigurationService);
    console.log("configurationServiceEffect:", typeof configurationServiceEffect, configurationServiceEffect !== undefined);

    // Temporarily simplify this layer for debugging
    const harnessComponentsLayer = Layer.mergeAll(
        EffectRunnerServiceLive
        // AssertionHelperServiceLive, 
        // Layer.succeed(MockAccessorService, mockAccessorServiceImplObject as MockAccessorApi),
        // Layer.effect(FixtureService, fixtureServiceEffect as Effect.Effect<FixtureApi, never, never>)
    );

    // Ensure ConfigurationService has NodeContext during its own initialization
    const configurationLayerWithNodeContext = Layer.effect(
        ConfigurationService,
        Effect.provide(NodeContext.layer)(configurationServiceEffect as Effect.Effect<ConfigurationServiceApi, never, never>)
    );

    // Merge the user's input layer, node context, simplified internal harness services, and configuration service.
    const finalLayerForRuntime = Layer.mergeAll(
        inputLayer,
        NodeContext.layer,
        harnessComponentsLayer, // Simplified layer
        configurationLayerWithNodeContext
    );

    const runtimeEffect = Layer.toRuntime(finalLayerForRuntime).pipe(
        Effect.flatMap(runtime =>
            Effect.gen(function* () {
                const runners = yield* EffectRunnerService
                const assertions = yield* AssertionHelperService
                const mocks = yield* MockAccessorService
                const fixtures = yield* FixtureService

                let ended = false; // Local state for mockSpan
                const attributes = new Map<string, any>();
                let currentStatus: SpanStatus = { _tag: "Started", startTime: BigInt(Date.now()) };

                const mockSpan: Span = {
                    _tag: "Span",
                    kind: "internal",
                    name: "mock-span",
                    spanId: "mock-span-id",
                    traceId: "mock-trace-id",
                    parent: Option.none<Span>(),
                    context: Context.empty(),
                    status: currentStatus,
                    attributes: attributes,
                    links: [],
                    addLinks: (links: readonly SpanLink[]) => { },
                    sampled: true,
                    end: (endTime, exit) => { ended = true; (currentStatus as any)._tag = "Ended"; (currentStatus as any).endTime = endTime; (currentStatus as any).exit = exit; },
                    event: (name, startTime, attributes) => { },
                    attribute: (key, value) => { attributes.set(key, value); }
                }

                const harnessApi: TestHarnessApi = {
                    runners,
                    assertions,
                    mocks,
                    fixtures,
                    mockSpan: mockSpan as any,
                    context: Context.empty() as any
                }

                return {
                    runtime,
                    harnessApi,
                    // runTest and runTestPromise are now defined outside this Effect, using the resolved runtime
                }
            })
        )
    )

    const scopedRuntimeEffect = Effect.scoped(runtimeEffect)
    // Assume finalLayerForRuntime correctly makes scopedRuntimeEffect's R type 'never'
    // Cast to satisfy Effect.runSync's expectation if type inference is struggling.
    const resolvedHarnessRuntimeAndApi = Effect.runSync(
        scopedRuntimeEffect as Effect.Effect<
            { runtime: Runtime.Runtime<R | NodeContext.NodeContext>; harnessApi: TestHarnessApi<unknown> },
            any, // E type - preserve from scopedRuntimeEffect
            never // R type - assert that it's never
        >
    )
    const { runtime, harnessApi } = resolvedHarnessRuntimeAndApi;

    return {
        runtime,
        harness: harnessApi,
        runTest: async (testEffect: Effect.Effect<A, E, R>) => {
            return Runtime.runPromise(runtime)(Effect.provide(testEffect, finalLayerForRuntime) as Effect.Effect<A, E, never>)
        },
        runTestPromise: async (testEffect: Effect.Effect<A, E, R>) => {
            return Runtime.runPromise(runtime)(Effect.provide(testEffect, finalLayerForRuntime) as Effect.Effect<A, E, never>)
        },
        runFailTest: async <A_Fail, E_Fail, R_Test_Fail extends {} | never = never>(effect: Effect.Effect<A_Fail, E_Fail, R_Test_Fail>) => {
            return Runtime.runPromiseExit(runtime)(Effect.provide(effect, finalLayerForRuntime) as Effect.Effect<A_Fail, E_Fail, never>)
        },
        expectError: async <A_Expect, E_Expect, R_Test_Expect extends {} | never = never>(effect: Effect.Effect<A_Expect, E_Expect, R_Test_Expect>, errorTag: string) => {
            const exit = await Runtime.runPromiseExit(runtime)(Effect.provide(effect, finalLayerForRuntime) as Effect.Effect<A_Expect, E_Expect, never>)
            if (EffectExit.isSuccess(exit)) {
                throw new Error(`Expected error with tag '${errorTag}' but got success.`)
            }
            const failureOption = Cause.failureOption(exit.cause)
            if (Option.isNone(failureOption)) {
                throw new Error(`Expected error with tag '${errorTag}' but encountered a failure with no specific error value.`)
            }
            const error = failureOption.value
            const actualTag = error && typeof error === "object" && "_tag" in error ? (error as { _tag: unknown })._tag : undefined
            if (actualTag !== errorTag) {
                throw new Error(`Expected error with tag '${errorTag}' but got '${actualTag ?? String(error)}'.`)
            }
        },
        close: () => Promise.resolve() // Scope managed by Effect.scoped, so this is a no-op or for other resources.
    } as ServiceTestHarness<R, E, A>
}

/**
 * Generic in-memory RepositoryServiceApi mock factory for tests.
 * @template TEntity - The entity type
 * @param entityType - The string identifier for the entity type
 * @param config - Optional configuration for failure simulation and tracking
 * @returns RepositoryServiceApi<TEntity> and optional hooks
 */
export interface InMemoryRepoMockConfig<TEntity extends BaseEntity> {
    failOnCreate?: string[]
    failOnDelete?: string[]
    requestsBeforeFailure?: number
    simulateNetworkIssue?: boolean
    onCreate?: (entity: TEntity) => void
    onDelete?: (id: string) => void
}

export function createInMemoryRepositoryMock<TEntity extends BaseEntity>(
    entityType: string,
    config: InMemoryRepoMockConfig<TEntity> = {}
): RepositoryServiceApi<TEntity> & {
    getAll: () => TEntity[]
    clear: () => void
} {
    const entities: Record<string, TEntity> = {}
    let requestCount = 0

    function maybeFailOnRequest(): Effect.Effect<undefined, RepositoryError> {
        if (config.simulateNetworkIssue && Math.random() < 0.2) {
            return Effect.fail(new RepositoryError({
                message: `Simulated network connectivity issue`,
                entityType
            }))
        }
        if (config.requestsBeforeFailure && ++requestCount >= config.requestsBeforeFailure) {
            return Effect.fail(new RepositoryError({
                message: `Simulated failure after too many requests`,
                entityType
            }))
        }
        return Effect.succeed(undefined)
    }

    return {
        create: (data: TEntity["data"]) => Effect.gen(function* () {
            yield* maybeFailOnRequest()
            if (config.failOnCreate && (config.failOnCreate as string[]).some(id => id === (data as any).id)) {
                return yield* Effect.fail(new RepositoryError({
                    message: `Simulated create failure for specific entity`,
                    entityType
                }))
            }
            const id = (data as any).id ?? `entity-${crypto.randomUUID()}`
            const now = Date.now()
            const entity = { id, createdAt: now, updatedAt: now, data } as TEntity
            entities[id] = entity
            config.onCreate?.(entity)
            return entity
        }),
        findById: (id: string) => Effect.succeed(entities[id] ? Option.some(entities[id]) : Option.none<TEntity>()),
        findOne: () => Effect.succeed(Option.none()),
        findMany: (options?: any) => {
            const filter = options?.filter || {}
            const results: TEntity[] = []
            for (const entity of Object.values(entities)) {
                let match = true
                for (const key in filter) {
                    if ((entity.data as any)[key] !== filter[key]) {
                        match = false
                        break
                    }
                }
                if (match) results.push(entity)
            }
            return Effect.succeed(results)
        },
        update: (id: string, patch: Partial<TEntity["data"]>) => {
            if (!entities[id]) {
                return Effect.fail(new RepositoryError({ message: `Entity not found`, entityType }))
            }
            entities[id] = { ...entities[id], data: { ...entities[id].data, ...patch }, updatedAt: Date.now() }
            return Effect.succeed(entities[id])
        },
        delete: (id: string) => Effect.gen(function* () {
            yield* maybeFailOnRequest()
            if (config.failOnDelete && config.failOnDelete.includes(id)) {
                return yield* Effect.fail(new RepositoryError({
                    message: `Simulated delete failure for specific entity`,
                    entityType
                }))
            }
            if (!entities[id]) {
                return yield* Effect.fail(new RepositoryError({
                    message: `Entity not found`,
                    entityType
                }))
            }
            delete entities[id]
            config.onDelete?.(id)
            return undefined
        }),
        count: () => Effect.succeed(Object.keys(entities).length),
        getAll: () => Object.values(entities),
        clear: () => { for (const k in entities) delete entities[k] }
    }
}

/**
 * Helper to compose a service layer with a repository mock layer for tests.
 * @template TService - The service type
 * @template TRepo - The repository type
 * @param serviceLayer - The Layer providing the service implementation (e.g., ServiceLive or Service.Default)
 * @param repoTag - The Context.Tag for the repository
 * @param repoImpl - The repository implementation or a factory function returning it
 * @returns Layer providing the service with the repository mock
 */
export function createServiceTestLayer<TService, TRepo>(
    serviceLayer: Layer.Layer<TService, never, TRepo>,
    repoTag: import("effect").Context.Tag<TRepo, TRepo>,
    repoImpl: TRepo | (() => TRepo)
): Layer.Layer<TService, never, never> {
    const repoLayer = typeof repoImpl === "function"
        ? Layer.effect(repoTag, Effect.sync(repoImpl as () => TRepo))
        : Layer.succeed(repoTag, repoImpl)
    return Layer.provide(serviceLayer, repoLayer)
}

/**
 * Creates a mock service layer with call tracking for all methods.
 *
 * @template T - The service interface type
 * @param tag - The Context.Tag for the service
 * @param implementation - The mock implementation of the service
 * @returns An object with:
 *   - layer: Layer providing the tracked mock service
 *   - calls: function to get call arguments for a method
 *   - reset: function to clear call history
 */
export function createTrackedMockLayer<T extends object>(
    tag: import("effect").Context.Tag<T, T>,
    implementation: T
): {
    layer: Layer.Layer<T, never, never>
    calls: <K extends keyof T>(methodName: K) => unknown[][]
    reset: () => void
} {
    const callStore = new Map<string, unknown[][]>()

    // Proxy to track calls
    const proxy = new Proxy(implementation, {
        get(target, prop: string) {
            const orig = target[prop as keyof T]
            if (typeof orig === "function") {
                return (...args: unknown[]) => {
                    const calls = callStore.get(prop) ?? []
                    calls.push(args)
                    callStore.set(prop, calls)
                    return (orig as Function).apply(target, args)
                }
            }
            return orig
        }
    })

    return {
        layer: Layer.succeed(tag, proxy as T),
        calls: <K extends keyof T>(methodName: K) => callStore.get(methodName as string) ?? [],
        reset: () => callStore.clear()
    }
} 