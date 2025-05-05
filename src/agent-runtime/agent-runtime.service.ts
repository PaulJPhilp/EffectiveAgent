import { Effect, Fiber, Ref, Stream, pipe } from "effect"
import type { AgentRuntimeServiceApi } from "./agent-runtime.contract.js"
import { AgentRuntimeError, AgentRuntimeNotFoundError } from "./agent-runtime.errors.js"
import { AgentRuntimeInstance } from "./agent-runtime.instance.js"
import { type AgentActivity, AgentActivityType, type AgentRuntimeId } from "./agent-runtime.types.js"

/**
 * Implementation of the AgentRuntimeService
 */
export class AgentRuntimeService extends Effect.Service<AgentRuntimeServiceApi>()("AgentRuntimeService", {
    effect: Effect.gen(function* () {
        // Create instances map
        const instances = yield* Ref.make(
            new Map<AgentRuntimeId, {
                instance: AgentRuntimeInstance<any, any, any>,
                fiber: Fiber.RuntimeFiber<never, any>
            }>()
        )

        // Helper to get instance
        const getInstance = <S, E = never, R = never>(id: AgentRuntimeId): Effect.Effect<AgentRuntimeInstance<S, E, R>, AgentRuntimeNotFoundError> =>
            pipe(
                Ref.get(instances),
                Effect.map(map => map.get(id)),
                Effect.flatMap(entry =>
                    entry
                        ? Effect.succeed(entry.instance as AgentRuntimeInstance<S, E, R>)
                        : Effect.fail(new AgentRuntimeNotFoundError({ agentRuntimeId: id, message: `AgentRuntime ${id} not found` }))
                )
            )

        // Return implementation
        return {
            create: <S, E = never, R = never>(id: AgentRuntimeId, initialState: S) =>
                Effect.gen(function* () {
                    // Check if ID already exists
                    const existing = yield* pipe(
                        Ref.get(instances),
                        Effect.map(map => map.has(id))
                    )

                    if (existing) {
                        return yield* Effect.fail(new AgentRuntimeError({
                            agentRuntimeId: id,
                            message: `AgentRuntime with ID ${id} already exists`
                        }))
                    }

                    // Create instance with default workflow
                    const instance = yield* AgentRuntimeInstance.create(
                        id,
                        initialState,
                        (activity: AgentActivity, state: S) => {
                            if (activity.type === AgentActivityType.STATE_CHANGE) {
                                return Effect.succeed({
                                    ...state,
                                    ...(activity.payload as S)
                                })
                            }
                            return Effect.succeed(state)
                        },
                        {
                            size: 1000,
                            enablePrioritization: true,
                            priorityQueueSize: 100,
                            backpressureTimeout: 5000
                        }
                    )

                    // Start processing
                    const fiber = yield* instance.startProcessing()

                    // Store instance and fiber
                    yield* Ref.update(instances, map =>
                        map.set(id, {
                            instance,
                            fiber: fiber as Fiber.RuntimeFiber<never, any>
                        })
                    )

                    // Return AgentRuntime interface
                    return {
                        id,
                        send: instance.send,
                        getState: instance.getState,
                        subscribe: instance.subscribe
                    }
                }),

            terminate: (id: AgentRuntimeId) =>
                pipe(
                    Effect.gen(function* () {
                        // Try to atomically get and mark the instance for termination
                        const entry = yield* Ref.modify(instances, map => {
                            const entry = map.get(id)
                            if (!entry) {
                                return [null, map] as const
                            }
                            const newMap = new Map(map)
                            newMap.delete(id)
                            return [entry, newMap] as const
                        })

                        if (!entry) {
                            return yield* Effect.fail(new AgentRuntimeNotFoundError({
                                agentRuntimeId: id,
                                message: `AgentRuntime ${id} not found or already terminating`
                            }))
                        }

                        return entry
                    }),
                    Effect.flatMap(entry =>
                        pipe(
                            Effect.all([
                                Fiber.interrupt(entry.fiber),
                                entry.instance.terminate()
                            ]),
                            Effect.tap(() =>
                                Ref.update(instances, map => {
                                    map.delete(id)
                                    return map
                                })
                            )
                        )
                    )
                ),

            send: <S, E = never, R = never>(id: AgentRuntimeId, activity: AgentActivity) =>
                Effect.gen(function* () {
                    const instance = yield* getInstance<S, E, R>(id)
                    yield* instance.send(activity)
                }),

            getState: <S, E = never, R = never>(id: AgentRuntimeId) =>
                Effect.gen(function* () {
                    const instance = yield* getInstance<S, E, R>(id)
                    return yield* instance.getState()
                }),

            subscribe: <S, E = never, R = never>(id: AgentRuntimeId) =>
                pipe(
                    Effect.gen(function* () {
                        const instance = yield* getInstance<S, E, R>(id)
                        return instance.subscribe()
                    }),
                    Stream.unwrap
                )
        }
    })
}) { }

export default AgentRuntimeService