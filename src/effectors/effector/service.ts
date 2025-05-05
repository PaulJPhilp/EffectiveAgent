import { Effect, Fiber, Ref, Stream, pipe } from "effect"
import type { EffectorServiceApi } from "./api.js"
import { EffectorError, EffectorNotFoundError } from "./errors.js"
import { EffectorInstance } from "./instance.js"
import { type AgentRecord, AgentRecordType, type EffectorId } from "./types.js"

/**
 * Implementation of the EffectorService
 */
export class EffectorService extends Effect.Service<EffectorServiceApi>()(
    "EffectorService",
    {
        effect: Effect.gen(function* () {
            // Create instances map
            const instances = yield* Ref.make(
                new Map<EffectorId, {
                    instance: EffectorInstance<any, any, any>,
                    fiber: Fiber.RuntimeFiber<never, any>,
                    terminating?: boolean
                }>()
            )

            // Helper to get instance
            const getInstance = <S, E = never, R = never>(id: EffectorId): Effect.Effect<EffectorInstance<S, E, R>, EffectorNotFoundError> =>
                pipe(
                    Ref.get(instances),
                    Effect.map(map => map.get(id)),
                    Effect.flatMap(entry =>
                        entry && !entry.terminating
                            ? Effect.succeed(entry.instance as EffectorInstance<S, E, R>)
                            : Effect.fail(new EffectorNotFoundError({ effectorId: id, message: `Effector ${id} not found` }))
                    )
                )

            // Return implementation
            return {
                create: <S, E = never, R = never>(id: EffectorId, initialState: S) =>
                    Effect.gen(function* () {
                        // Check if ID already exists
                        const existing = yield* pipe(
                            Ref.get(instances),
                            Effect.map(map => map.has(id))
                        )

                        if (existing) {
                            return yield* Effect.fail(new EffectorError({
                                effectorId: id,
                                message: `Effector with ID ${id} already exists`
                            }))
                        }

                        // Create instance with default logic
                        const instance = yield* EffectorInstance.create(
                            id,
                            initialState,
                            (record: AgentRecord, state: S) => {
                                if (record.type === AgentRecordType.STATE_CHANGE) {
                                    return Effect.succeed({
                                        ...state,
                                        ...(record.payload as S)
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

                        // Return Effector interface
                        return {
                            id,
                            send: instance.send,
                            getState: instance.getState,
                            subscribe: instance.subscribe
                        }
                    }),

                terminate: (id: EffectorId) =>
                    pipe(
                        Effect.gen(function* () {
                            // Try to atomically get and mark the instance for termination
                            const entry = yield* Ref.modify(instances, map => {
                                const entry = map.get(id)
                                if (!entry || entry.terminating) {
                                    return [null, map] as const
                                }
                                const newMap = new Map(map)
                                newMap.set(id, { ...entry, terminating: true })
                                return [entry, newMap] as const
                            })

                            if (!entry) {
                                return yield* Effect.fail(new EffectorNotFoundError({
                                    effectorId: id,
                                    message: `Effector ${id} not found or already terminating`
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

                send: <S, E = never, R = never>(id: EffectorId, record: AgentRecord) =>
                    Effect.gen(function* () {
                        const instance = yield* getInstance<S, E, R>(id)
                        yield* instance.send(record)
                    }),

                getState: <S, E = never, R = never>(id: EffectorId) =>
                    Effect.gen(function* () {
                        const instance = yield* getInstance<S, E, R>(id)
                        return yield* instance.getState()
                    }),

                subscribe: <S, E = never, R = never>(id: EffectorId): Stream.Stream<AgentRecord, EffectorNotFoundError | Error> =>
                    pipe(
                        Effect.gen(function* () {
                            const instance = yield* getInstance<S, E, R>(id)
                            return instance.subscribe()
                        }),
                        Stream.unwrap
                    )
            }
        })
    }
) { }

export default EffectorService