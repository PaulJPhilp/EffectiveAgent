import { Effect, Fiber, Ref, Stream, pipe } from "effect"
import { AgentRuntimeServiceApi } from "./api.js"
import { AgentRuntimeError, AgentRuntimeNotFoundError, AgentRuntimeProcessingError } from "./errors.js"
import { PrioritizedMailbox } from "./mailbox/prioritized-mailbox.js"
import { AgentActivity, AgentActivityType, AgentRuntimeId, AgentRuntimeState, AgentRuntimeStatus } from "./types.js"

interface RuntimeEntry<S> {
    state: Ref.Ref<AgentRuntimeState<S>>
    mailbox: PrioritizedMailbox
    fiber: Fiber.RuntimeFiber<void, never>
    workflow: (activity: AgentActivity, state: S) => Effect.Effect<S, AgentRuntimeProcessingError>
}

export class AgentRuntimeService extends Effect.Service<AgentRuntimeServiceApi>()(
    "AgentRuntimeService",
    {
        scoped: Effect.gen(function* () {
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

                    const workflow = (activity: AgentActivity, state: S): Effect.Effect<S, AgentRuntimeProcessingError> => {
                        switch (activity.type) {
                            case AgentActivityType.STATE_CHANGE:
                                return Effect.try({
                                    try: () => {
                                        if (typeof activity.payload !== "object" || activity.payload === null) {
                                            throw new Error("State change payload must be an object")
                                        }
                                        return { ...state, ...activity.payload as object }
                                    },
                                    catch: error => new AgentRuntimeProcessingError({
                                        agentRuntimeId: id,
                                        activityId: activity.id,
                                        message: "Failed to apply state change",
                                        cause: error
                                    })
                                })
                            case AgentActivityType.COMMAND:
                                return Effect.fail(new AgentRuntimeProcessingError({
                                    agentRuntimeId: id,
                                    activityId: activity.id,
                                    message: "Command activities not implemented"
                                }))
                            default:
                                return Effect.fail(new AgentRuntimeProcessingError({
                                    agentRuntimeId: id,
                                    activityId: activity.id,
                                    message: `Unknown activity type: ${activity.type}`
                                }))
                        }
                    }

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

            function startProcessing<S>(
                id: AgentRuntimeId,
                stateRef: Ref.Ref<AgentRuntimeState<S>>,
                mailbox: PrioritizedMailbox,
                workflow: (activity: AgentActivity, state: S) => Effect.Effect<S, AgentRuntimeProcessingError>
            ): Effect.Effect<Fiber.RuntimeFiber<void, never>> {
                return Effect.fork(
                    Effect.gen(function* () {
                        yield* updateStatus(stateRef, AgentRuntimeStatus.IDLE)
                        while (true) {
                            yield* pipe(
                                mailbox.take(),
                                Effect.tap(() => updateStatus(stateRef, AgentRuntimeStatus.PROCESSING)),
                                Effect.mapError(error => new AgentRuntimeProcessingError({
                                    agentRuntimeId: id,
                                    activityId: "unknown",
                                    message: `Failed to take message from mailbox: ${error instanceof Error ? error.message : String(error)}`,
                                    cause: error
                                })),
                                Effect.flatMap(activity =>
                                    Ref.get(stateRef).pipe(
                                        Effect.flatMap(currentState => {
                                            const startTime = Date.now()
                                            return workflow(activity, currentState.state).pipe(
                                                Effect.matchCauseEffect({
                                                    onFailure: cause =>
                                                        Ref.update(stateRef, (state: AgentRuntimeState<S>) => ({
                                                            ...state,
                                                            status: AgentRuntimeStatus.ERROR,
                                                            error: cause,
                                                            lastUpdated: Date.now(),
                                                            processing: {
                                                                processed: state.processing?.processed ?? 0,
                                                                failures: (state.processing?.failures ?? 0) + 1,
                                                                avgProcessingTime: state.processing?.avgProcessingTime ?? 0,
                                                                lastError: cause
                                                            }
                                                        })).pipe(
                                                            Effect.zipRight(
                                                                Effect.fail(new AgentRuntimeProcessingError({
                                                                    agentRuntimeId: id,
                                                                    activityId: activity.id,
                                                                    message: `Error processing activity ${activity.id} in AgentRuntime ${id}`,
                                                                    cause
                                                                }))
                                                            )
                                                        ),
                                                    onSuccess: newState => {
                                                        const endTime = Date.now()
                                                        const processingTime = endTime - startTime
                                                        return Ref.update(stateRef, (state: AgentRuntimeState<S>) => ({
                                                            ...state,
                                                            state: newState,
                                                            status: AgentRuntimeStatus.IDLE,
                                                            lastUpdated: endTime,
                                                            processing: {
                                                                processed: (state.processing?.processed ?? 0) + 1,
                                                                failures: state.processing?.failures ?? 0,
                                                                avgProcessingTime: calculateAvgTime(
                                                                    state.processing?.avgProcessingTime ?? 0,
                                                                    state.processing?.processed ?? 0,
                                                                    processingTime
                                                                )
                                                            }
                                                        }))
                                                    }
                                                })
                                            )
                                        })
                                    )
                                ),
                                Effect.catchAll(error =>
                                    Ref.update(stateRef, (state: AgentRuntimeState<S>) => ({
                                        ...state,
                                        status: AgentRuntimeStatus.ERROR,
                                        error,
                                        lastUpdated: Date.now()
                                    }))
                                )
                            )
                        }
                    }).pipe(
                        Effect.catchAll(() => Effect.succeed<void>(void 0))
                    )
                )
            }

            function updateStatus<S>(stateRef: Ref.Ref<AgentRuntimeState<S>>, status: typeof AgentRuntimeStatus[keyof typeof AgentRuntimeStatus]) {
                return Ref.update(stateRef, state => ({
                    ...state,
                    status,
                    lastUpdated: Date.now()
                }))
            }

            function calculateAvgTime(currentAvg: number, processed: number, newTime: number): number {
                return ((currentAvg * processed) + newTime) / (processed + 1)
            }

            return {
                create,
                terminate,
                send,
                getState,
                subscribe
            }
        })
    }
) { }