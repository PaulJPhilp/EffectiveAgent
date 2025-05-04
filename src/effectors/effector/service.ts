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
                    fiber: Fiber.RuntimeFiber<never, any>
                }>()
            )

            // Helper to get instance
            const getInstance = <S, E = never, R = never>(id: EffectorId): Effect.Effect<EffectorInstance<S, E, R>, EffectorNotFoundError> =>
                pipe(
                    Ref.get(instances),
                    Effect.map(map => map.get(id)),
                    Effect.flatMap(entry =>
                        entry
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
                    Effect.gen(function* () {
                        const entry = yield* pipe(
                            Ref.get(instances),
                            Effect.map(map => map.get(id)),
                            Effect.flatMap(entry =>
                                entry
                                    ? Effect.succeed(entry)
                                    : Effect.fail(new EffectorNotFoundError({ effectorId: id, message: `Effector ${id} not found` }))
                            )
                        )

                        // Interrupt fiber first to stop processing
                        yield* Fiber.interrupt(entry.fiber)

                        // Then terminate instance to clean up resources
                        yield* entry.instance.terminate()

                        // Remove from instances
                        yield* Ref.update(instances, newMap => {
                            newMap.delete(id)
                            return newMap
                        })
                    }),

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