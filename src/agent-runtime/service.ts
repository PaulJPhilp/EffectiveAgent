import { EffectiveError } from "@/errors.js"
import { ModelService, ProviderService } from "@/services/ai/index.js"
import { PolicyService } from "@/services/ai/policy/service.js"
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js"
import { FileService } from "@/services/core/file/service.js"
import { Effect, Fiber, Ref, Stream } from "effect"
import type { AgentRuntimeServiceApi } from "./api.js"
import {
    AgentRuntimeError,
    AgentRuntimeNotFoundError,
    AgentRuntimeProcessingError
} from "./errors.js"
import { PrioritizedMailbox } from "./mailbox/prioritized-mailbox.js"
import {
    AgentActivity,
    AgentRuntimeId,
    AgentRuntimeState,
    AgentRuntimeStatus,
    CompiledLangGraph,
    LangGraphAgentRuntimeState,
    LangGraphRunOptions
} from "./types.js"

interface RuntimeEntry<S> {
    stateRef: Ref.Ref<AgentRuntimeState<S>>
    mailbox: PrioritizedMailbox
    fiber: Fiber.RuntimeFiber<void, never>
    workflow: (activity: AgentActivity, state: S) => Effect.Effect<S, AgentRuntimeProcessingError>
}

const startProcessing = <S>(
    id: AgentRuntimeId,
    stateRef: Ref.Ref<AgentRuntimeState<S>>,
    mailbox: PrioritizedMailbox,
    workflow: (activity: AgentActivity, state: S) => Effect.Effect<S, AgentRuntimeProcessingError>
): Effect.Effect<Fiber.RuntimeFiber<void, never>, never> =>
    Effect.forkDaemon(
        mailbox.subscribe().pipe(
            Stream.catchAll(error => Stream.empty),
            Stream.runForEach((activity: AgentActivity) =>
                Effect.gen(function* () {
                    yield* Ref.update(stateRef, state => ({
                        ...state,
                        status: AgentRuntimeStatus.PROCESSING,
                        lastUpdated: Date.now()
                    }))

                    const currentState = yield* Ref.get(stateRef)
                    const newState = yield* workflow(activity, currentState.state)

                    yield* Ref.update(stateRef, state => ({
                        ...state,
                        state: newState,
                        status: AgentRuntimeStatus.IDLE,
                        lastUpdated: Date.now(),
                        processing: {
                            processed: (state.processing?.processed ?? 0) + 1,
                            failures: state.processing?.failures ?? 0,
                            avgProcessingTime: state.processing?.avgProcessingTime ?? 0
                        }
                    }))
                }).pipe(
                    Effect.catchAll((error: AgentRuntimeProcessingError) =>
                        Ref.update(stateRef, state => ({
                            ...state,
                            status: AgentRuntimeStatus.ERROR,
                            lastUpdated: Date.now(),
                            error,
                            processing: {
                                processed: state.processing?.processed ?? 0,
                                failures: (state.processing?.failures ?? 0) + 1,
                                avgProcessingTime: state.processing?.avgProcessingTime ?? 0
                            }
                        }))
                    )
                )
            )
        )
    )

export class AgentRuntimeService extends Effect.Service<AgentRuntimeServiceApi>()(
    "AgentRuntimeService",
    {
        effect: Effect.gen(function* () {
            // Get the configured services
            const modelService = yield* ModelService
            const providerService = yield* ProviderService
            const policyService = yield* PolicyService
            const toolRegistryService = yield* ToolRegistryService
            const fileService = yield* FileService

            // Agent management state
            const runtimes = yield* Ref.make<Map<AgentRuntimeId, RuntimeEntry<any>>>(new Map())

            const create = <S>(id: AgentRuntimeId, initialState: S) =>
                Effect.gen(function* () {
                    const map = yield* Ref.get(runtimes)
                    if (map.has(id)) {
                        return yield* Effect.fail(new AgentRuntimeError({
                            agentRuntimeId: id,
                            message: `AgentRuntime with ID ${id} already exists`
                        }))
                    }

                    const stateRef = yield* Ref.make<AgentRuntimeState<S>>({
                        id,
                        state: initialState,
                        status: AgentRuntimeStatus.IDLE,
                        lastUpdated: Date.now(),
                        processing: { processed: 0, failures: 0, avgProcessingTime: 0 }
                    })

                    const mailbox = yield* PrioritizedMailbox.create({
                        size: 1000,
                        enablePrioritization: true,
                        priorityQueueSize: 100
                    })

                    // Default workflow - just updates state
                    const workflow = (activity: AgentActivity, state: S) =>
                        Effect.succeed(state)

                    const fiber = yield* startProcessing(id, stateRef, mailbox, workflow)
                    yield* Ref.update(runtimes, map => {
                        map.set(id, { stateRef, mailbox, fiber, workflow })
                        return map
                    })

                    return {
                        id,
                        send: (activity: AgentActivity) => mailbox.offer(activity),
                        getState: () => Ref.get(stateRef),
                        subscribe: () => mailbox.subscribe()
                    }
                })

            const terminate = (id: AgentRuntimeId) =>
                Effect.gen(function* () {
                    const map = yield* Ref.get(runtimes)
                    const entry = map.get(id)
                    if (!entry) {
                        return yield* Effect.fail(new AgentRuntimeNotFoundError({
                            agentRuntimeId: id,
                            message: `AgentRuntime ${id} not found`
                        }))
                    }
                    yield* Fiber.interrupt(entry.fiber)
                    yield* entry.mailbox.shutdown()
                    yield* Ref.update(runtimes, map => {
                        map.delete(id)
                        return map
                    })
                })

            const send = (id: AgentRuntimeId, activity: AgentActivity) =>
                Effect.gen(function* () {
                    const map = yield* Ref.get(runtimes)
                    const entry = map.get(id)
                    if (!entry) {
                        return yield* Effect.fail(new AgentRuntimeNotFoundError({
                            agentRuntimeId: id,
                            message: `AgentRuntime ${id} not found`
                        }))
                    }
                    return yield* entry.mailbox.offer(activity)
                })

            const getState = <S>(id: AgentRuntimeId) =>
                Effect.gen(function* () {
                    const map = yield* Ref.get(runtimes)
                    const entry = map.get(id)
                    if (!entry) {
                        return yield* Effect.fail(new AgentRuntimeNotFoundError({
                            agentRuntimeId: id,
                            message: `AgentRuntime ${id} not found`
                        }))
                    }
                    return yield* Ref.get(entry.stateRef)
                })

            const subscribe = (id: AgentRuntimeId) =>
                Stream.unwrap(
                    Effect.gen(function* () {
                        const map = yield* Ref.get(runtimes)
                        const entry = map.get(id)
                        if (!entry) {
                            return Stream.fail(new AgentRuntimeNotFoundError({
                                agentRuntimeId: id,
                                message: `AgentRuntime ${id} not found`
                            }))
                        }
                        return entry.mailbox.subscribe()
                    })
                )

            // Service access methods
            const getModelService = () => Effect.succeed(modelService)
            const getProviderService = () => Effect.succeed(providerService)
            const getPolicyService = () => Effect.succeed(policyService)
            const getToolRegistryService = () => Effect.succeed(toolRegistryService)
            const getFileService = () => Effect.succeed(fileService)

            // LangGraph support
            const createLangGraphAgent = <TState extends { readonly agentRuntime: AgentRuntimeServiceApi }>(
                compiledGraph: CompiledLangGraph<TState>,
                initialState: TState,
                langGraphRunOptions?: LangGraphRunOptions
            ) => Effect.gen(function* () {
                // Generate a unique ID for this LangGraph agent
                const id = `langgraph-${Date.now()}-${Math.random().toString(36).slice(2)}` as AgentRuntimeId

                // Initialize state with LangGraph stats
                const stateRef = yield* Ref.make<LangGraphAgentRuntimeState<TState>>({
                    id,
                    state: initialState,
                    status: AgentRuntimeStatus.IDLE,
                    lastUpdated: Date.now(),
                    processing: { processed: 0, failures: 0, avgProcessingTime: 0 },
                    langGraph: { invocations: 0, avgInvokeTime: 0, recursionLimitHits: 0 }
                })

                const mailbox = yield* PrioritizedMailbox.create({
                    size: 1000,
                    enablePrioritization: true,
                    priorityQueueSize: 100
                })

                // LangGraph workflow that invokes the graph with activity payload
                const workflow = (activity: AgentActivity, state: TState): Effect.Effect<TState, AgentRuntimeProcessingError> =>
                    Effect.gen(function* () {
                        const startTime = Date.now()
                        const result = yield* Effect.tryPromise(() =>
                            compiledGraph.invoke(state, {
                                configurable: {
                                    ea_activity_payload: activity.payload,
                                    ...langGraphRunOptions
                                }
                            })
                        ).pipe(
                            Effect.mapError(error => new AgentRuntimeProcessingError({
                                activityId: activity.id,
                                agentRuntimeId: id,
                                message: "Failed to execute LangGraph workflow",
                                cause: error
                            }))
                        )

                        // Update LangGraph stats
                        yield* Ref.update(stateRef, state => ({
                            ...state,
                            langGraph: {
                                invocations: (state.langGraph?.invocations ?? 0) + 1,
                                avgInvokeTime: (
                                    ((state.langGraph?.avgInvokeTime ?? 0) * (state.langGraph?.invocations ?? 0) +
                                        (Date.now() - startTime)) /
                                    ((state.langGraph?.invocations ?? 0) + 1)
                                ),
                                recursionLimitHits: state.langGraph?.recursionLimitHits ?? 0
                            }
                        }))

                        // Handle AsyncIterable result
                        if (Symbol.asyncIterator in (result as any)) {
                            const asyncResult = result as AsyncIterable<TState>
                            let lastState = state
                            // Convert for-await loop to synchronous processing within Effect
                            return yield* Effect.promise(async () => {
                                for await (const newState of asyncResult) {
                                    lastState = newState
                                }
                                return lastState
                            })
                        }

                        return result as TState
                    })

                const fiber = yield* startProcessing(id, stateRef, mailbox, workflow)
                yield* Ref.update(runtimes, map => {
                    map.set(id, { stateRef, mailbox, fiber, workflow })
                    return map
                })

                return {
                    agentRuntime: {
                        id,
                        send: (activity: AgentActivity) => mailbox.offer(activity),
                        getState: () => Ref.get(stateRef),
                        subscribe: () => mailbox.subscribe()
                    },
                    agentRuntimeId: id
                }
            })

            // Effect execution bridge
            const run = <Output, LogicError = EffectiveError>(
                logicToRun: Effect.Effect<Output, LogicError, any>
            ): Promise<Output> => Effect.runPromise(logicToRun as Effect.Effect<Output, LogicError, never>)

            return {
                create,
                terminate,
                send,
                getState,
                subscribe,
                getModelService,
                getProviderService,
                getPolicyService,
                getToolRegistryService,
                getFileService,
                createLangGraphAgent,
                run
            } satisfies AgentRuntimeServiceApi
        }),
        dependencies: [ModelService.Default, ProviderService.Default, PolicyService.Default, ToolRegistryService.Default, FileService.Default]
    }
) { }