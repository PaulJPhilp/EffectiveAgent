import { ModelService } from "@/services/ai/model/index.js"
import { PolicyService } from "@/services/ai/policy/index.js"
import { ProviderService } from "@/services/ai/provider/index.js"
import { Effect, Fiber, Ref, Stream } from "effect"
import { AgentRuntimeServiceApi } from "./api.js"
import { AgentRuntimeError, AgentRuntimeNotFoundError, AgentRuntimeProcessingError } from "./errors.js"
import { PrioritizedMailbox } from "./mailbox/prioritized-mailbox.js"
import { AgentActivity, AgentRuntimeId, AgentRuntimeState, AgentRuntimeStatus } from "./types.js"

interface RuntimeEntry<S> {
    state: Ref.Ref<AgentRuntimeState<S>>
    mailbox: PrioritizedMailbox
    fiber: Fiber.RuntimeFiber<void, any>
    workflow: (activity: AgentActivity, state: S) => Effect.Effect<S, AgentRuntimeProcessingError>
}

export class AgentRuntimeService extends Effect.Service<AgentRuntimeServiceApi>()(
    "AgentRuntimeService",
    {
        effect: Effect.gen(function* () {
            // Get the configured services
            const modelService = yield* ModelService
            const providerService = yield* ProviderService
            const policyService = yield* PolicyService

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
                        map.set(id, { state: stateRef, mailbox, fiber, workflow })
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

            const getState = (id: AgentRuntimeId) =>
                Effect.gen(function* () {
                    const map = yield* Ref.get(runtimes)
                    const entry = map.get(id)
                    if (!entry) {
                        return yield* Effect.fail(new AgentRuntimeNotFoundError({
                            agentRuntimeId: id,
                            message: `AgentRuntime ${id} not found`
                        }))
                    }
                    return yield* Ref.get(entry.state)
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

            return {
                // Agent management
                create,
                terminate,
                send,
                getState,
                subscribe,
                // Service access (provide configured services)
                getModelService: () => Effect.succeed(modelService),
                getProviderService: () => Effect.succeed(providerService),
                getPolicyService: () => Effect.succeed(policyService)
            }
        }),
        dependencies: [ModelService.Default, ProviderService.Default, PolicyService.Default]
    }
) { }

// Helper function for starting agent processing
const startProcessing = <S>(
    id: AgentRuntimeId,
    stateRef: Ref.Ref<AgentRuntimeState<S>>,
    mailbox: PrioritizedMailbox,
    workflow: (activity: AgentActivity, state: S) => Effect.Effect<S, AgentRuntimeProcessingError>
) =>
    Effect.gen(function* () {
        return yield* Effect.forkDaemon(
            mailbox.subscribe().pipe(
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
    })