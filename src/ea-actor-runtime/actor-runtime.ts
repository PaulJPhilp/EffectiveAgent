import { Effect, Fiber, Queue, Ref, Sink, Stream } from "effect"
import { AgentRuntimeError, AgentRuntimeProcessingError } from "./errors.js"
import { PrioritizedMailbox } from "./prioritized-mailbox.js"
import {
    AgentActivity,
    AgentRuntimeId,
    AgentRuntimeState,
    AgentRuntimeStatus,
    AgentWorkflow
} from "./types.js"

/**
 * Runtime entry internal structure.
 */
interface RuntimeEntry<S> {
    readonly stateRef: Ref.Ref<AgentRuntimeState<S>>
    readonly mailbox: PrioritizedMailbox
    readonly fiber: Fiber.RuntimeFiber<void, never>
    readonly workflow: AgentWorkflow<S, AgentRuntimeProcessingError>
}

/**
 * Registry for agent workflows.
 */
type WorkflowRegistry = Map<string, AgentWorkflow<any, AgentRuntimeProcessingError>>

const startProcessing = <S>(
    id: AgentRuntimeId,
    stateRef: Ref.Ref<AgentRuntimeState<S>>,
    mailbox: PrioritizedMailbox,
    workflow: AgentWorkflow<S, AgentRuntimeProcessingError>
): Effect.Effect<Fiber.RuntimeFiber<void, never>> =>
    Effect.forkDaemon(
        mailbox.subscribe().pipe(
            Stream.catchAll(() => Stream.empty),
            Stream.runForEach(activity =>
                Effect.gen(function* () {
                    // mark processing
                    yield* Ref.update(stateRef, st => ({
                        ...st,
                        status: AgentRuntimeStatus.PROCESSING,
                        lastUpdated: Date.now()
                    }))

                    const currentState = yield* Ref.get(stateRef)
                    const newState = yield* workflow(activity, currentState.state)

                    // update success
                    yield* Ref.update(stateRef, st => ({
                        ...st,
                        state: newState,
                        status: AgentRuntimeStatus.IDLE,
                        lastUpdated: Date.now(),
                        processing: {
                            processed: (st.processing?.processed ?? 0) + 1,
                            failures: st.processing?.failures ?? 0,
                            avgProcessingTime: st.processing?.avgProcessingTime ?? 0
                        }
                    }))
                }).pipe(
                    Effect.catchAll(error =>
                        Ref.update(stateRef, st => ({
                            ...st,
                            status: AgentRuntimeStatus.ERROR,
                            lastUpdated: Date.now(),
                            error,
                            processing: {
                                processed: st.processing?.processed ?? 0,
                                failures: (st.processing?.failures ?? 0) + 1,
                                avgProcessingTime: st.processing?.avgProcessingTime ?? 0
                            }
                        }))
                    )
                )
            )
        )
    ) as Effect.Effect<Fiber.RuntimeFiber<void, never>, never, never>

/**
 * Minimal ActorRuntime manager providing mailbox based message processing.
 */
export const ActorRuntimeManager = Effect.gen(function* () {
    const runtimes = yield* Ref.make<Map<AgentRuntimeId, RuntimeEntry<any>>>(new Map())
    const workflowRegistry = yield* Ref.make<WorkflowRegistry>(new Map())

    /**
     * Registers a new agent workflow by name.
     */
    const register = <S>(agentType: string, workflow: AgentWorkflow<S, AgentRuntimeProcessingError>) =>
        Ref.update(workflowRegistry, map => map.set(agentType, workflow))

    const create = <S>(id: AgentRuntimeId, agentType: string, initialState: S) =>
        Effect.gen(function* () {
            const workflows = yield* Ref.get(workflowRegistry)
            const workflow = workflows.get(agentType) as AgentWorkflow<S, AgentRuntimeProcessingError> | undefined

            if (!workflow) {
                return yield* Effect.fail(new AgentRuntimeError({
                    agentRuntimeId: id,
                    message: `Agent type "${agentType}" not registered.`
                }))
            }

            const map = yield* Ref.get(runtimes)
            if (map.has(id)) {
                return yield* Effect.fail(new AgentRuntimeError({
                    agentRuntimeId: id,
                    message: `ActorRuntime with ID ${id} already exists`
                }))
            }

            const stateRef = yield* Ref.make<AgentRuntimeState<S>>({
                id,
                state: initialState,
                status: AgentRuntimeStatus.IDLE,
                lastUpdated: Date.now(),
                processing: { processed: 0, failures: 0, avgProcessingTime: 0 }
            })

            const mailbox = yield* PrioritizedMailbox.create({ size: 1000, enablePrioritization: true, priorityQueueSize: 100 })

            const fiber = yield* startProcessing(id, stateRef, mailbox, workflow)

            yield* Ref.update(runtimes, m => {
                m.set(id, { stateRef, mailbox, fiber, workflow })
                return m
            })

            return {
                id,
                send: (activity: AgentActivity) => mailbox.offer(activity),
                getState: () => Ref.get(stateRef),
                subscribe: (queue: Queue.Queue<AgentActivity>) => Effect.gen(function* () {
                    const hub = mailbox.subscribe()
                    const fiber = yield* hub.pipe(
                        Stream.run(Sink.fromQueue(queue)),
                        Effect.fork,
                    )
                    // Return a finalizer to unsubscribe
                    return () => Fiber.interrupt(fiber)
                }),
                terminate: () => terminate(id)
            }
        })

    const terminate = (id: AgentRuntimeId) =>
        Effect.gen(function* () {
            const map = yield* Ref.get(runtimes)
            const entry = map.get(id)
            if (!entry) {
                return yield* Effect.fail(new AgentRuntimeError({
                    agentRuntimeId: id,
                    message: `ActorRuntime ${id} not found`
                }))
            }
            yield* Fiber.interrupt(entry.fiber)
            yield* entry.mailbox.shutdown()
            yield* Ref.update(runtimes, m => {
                m.delete(id)
                return m
            })
        })

    const send = (id: AgentRuntimeId, activity: AgentActivity) =>
        Effect.gen(function* () {
            const map = yield* Ref.get(runtimes)
            const entry = map.get(id)
            if (!entry) {
                return yield* Effect.fail(new AgentRuntimeError({
                    agentRuntimeId: id,
                    message: `ActorRuntime ${id} not found`
                }))
            }
            return yield* entry.mailbox.offer(activity)
        })

    const getState = <S>(id: AgentRuntimeId) =>
        Effect.gen(function* () {
            const map = yield* Ref.get(runtimes)
            const entry = map.get(id)
            if (!entry) {
                return yield* Effect.fail(new AgentRuntimeError({
                    agentRuntimeId: id,
                    message: `ActorRuntime ${id} not found`
                }))
            }
            return yield* Ref.get(entry.stateRef)
        })

    return {
        register,
        create,
        terminate,
        send,
        getState,
    }
}).pipe(Effect.runSync) 