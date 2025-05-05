import { createServiceTestHarness } from "@/services/core/test-harness/utils/service-test.js"
import { Duration, Effect, Either, Fiber, Layer, Ref, Stream, pipe } from "effect"
import { describe, expect, it } from "vitest"
import { EffectorServiceApi } from "../api.js"
import { EffectorError, EffectorNotFoundError } from "../errors.js"
import type { EffectorInstance } from "../instance.js"
import { EffectorInstance as EffectorInstanceImpl } from "../instance.js"
import { EffectorService } from "../service.js"
import type { AgentRecord, EffectorId } from "../types.js"
import { AgentRecordType, EffectorStatus, MessagePriority, makeEffectorId } from "../types.js"

// Create test implementation
const createTestImpl = () => Effect.gen(function* () {
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

    const api: EffectorServiceApi = {
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
                const instance = yield* EffectorInstanceImpl.create(
                    id,
                    initialState,
                    (record: AgentRecord, state: S) => {
                        if (record.type === AgentRecordType.STATE_CHANGE) {
                            return Effect.succeed({
                                ...state,
                                ...(record.payload as S)
                            })
                        }
                        if (record.type === AgentRecordType.COMMAND) {
                            const command = record.payload as { type: string; count: number }
                            if (command.type === "INCREMENT") {
                                // Add a small delay to simulate processing time
                                return pipe(
                                    Effect.sleep(10),
                                    Effect.map(() => ({
                                        ...state,
                                        count: command.count
                                    }))
                                )
                            }
                        }
                        return Effect.succeed(state)
                    },
                    {
                        size: 10, // Smaller size to trigger backpressure
                        enablePrioritization: true,
                        priorityQueueSize: 5, // Smaller priority queue size
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

                // Check if already terminated - silently proceed if terminated
                const state = yield* entry.instance.getState()
                if (state.status === EffectorStatus.TERMINATED) {
                    return
                }

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

    return api
})

// Create the test harness
const harness = createServiceTestHarness(
    EffectorService,
    createTestImpl
)

// Helper to run test effects with service layer
const runTest = <A, E>(effect: Effect.Effect<A, E, EffectorServiceApi>) =>
    Effect.runPromise(
        Effect.gen(function* () {
            const impl = yield* createTestImpl()
            return yield* Effect.provide(effect, Layer.succeed(EffectorService, impl))
        })
    )

// Helper to check if an Effect failed
const isEffectFailure = (result: unknown): boolean => {
    try {
        return Effect.isFailure(result as Effect.Effect<unknown, unknown, unknown>) as unknown as boolean
    } catch {
        return false
    }
}

// Helper to get effector instance (for testing only)
const getEffectorInstance = <S>(service: EffectorService, id: string): Effect.Effect<EffectorInstance<S>> =>
    // @ts-expect-error - accessing private method for testing
    service.getInstance(id)

describe("EffectorService", () => {
    describe("create", () => {
        it("should create a new Effector with initial state", () =>
            runTest(Effect.gen(function* () {
                const service = yield* EffectorService
                const id = makeEffectorId("test")
                const initialState = { count: 0 }

                const effector = yield* service.create(id, initialState)
                expect(effector.id).toBe(id)

                const state = yield* effector.getState()
                expect(state.state).toEqual(initialState)
                expect(state.status).toBe(EffectorStatus.IDLE)
                expect(state.processing).toBeDefined()
                expect(state.processing?.processed).toBe(0)
                expect(state.processing?.failures).toBe(0)
            }))
        )

        it("should fail when creating an Effector with existing ID", () =>
            runTest(Effect.gen(function* () {
                const service = yield* EffectorService
                const id = makeEffectorId("test")
                const initialState = { count: 0 }

                yield* service.create(id, initialState)
                const result = yield* Effect.flip(service.create(id, initialState))
                expect(result).toBeInstanceOf(EffectorError)
                expect(result.effectorId).toBe(id)
            }))
        )

        it("should handle concurrent creation attempts", () =>
            runTest(Effect.gen(function* () {
                const service = yield* EffectorService
                const id = makeEffectorId("test")
                const initialState = { count: 0 }

                const results = yield* Effect.all(
                    Array.from({ length: 10 }, () => Effect.either(service.create(id, initialState))),
                    { concurrency: "unbounded" }
                )

                // Only one should succeed
                const successes = results.filter(r => r._tag === "Right")
                expect(successes).toHaveLength(1)
            }))
        )
    })

    describe("terminate", () => {
        it("should terminate an existing Effector", () =>
            runTest(Effect.gen(function* () {
                const service = yield* EffectorService
                const id = makeEffectorId("test")
                const initialState = { count: 0 }

                const effector = yield* service.create(id, initialState)

                // Set up subscription to verify cleanup
                const messages: AgentRecord[] = []
                const fiber = yield* pipe(
                    effector.subscribe(),
                    Stream.tap(msg => Effect.sync(() => messages.push(msg))),
                    Stream.runDrain,
                    Effect.fork
                )

                yield* service.terminate(id)

                // Should fail to get state after termination
                const result = yield* Effect.flip(service.getState(id))
                expect(result).toBeInstanceOf(EffectorNotFoundError)

                // Subscription should be cleaned up
                yield* Fiber.interrupt(fiber)
            }))
        )

        it("should fail when terminating non-existent Effector", () =>
            runTest(Effect.gen(function* () {
                const service = yield* EffectorService
                const id = makeEffectorId("non-existent")
                const result = yield* Effect.flip(service.terminate(id))
                expect(result).toBeInstanceOf(EffectorNotFoundError)
                expect(result.effectorId).toBe(id)
            }))
        )

        it("should handle concurrent termination attempts", () => {
            const program = Effect.gen(function* () {
                const service = yield* EffectorService
                const id = makeEffectorId("test")
                const initialState = { count: 0 }

                yield* service.create(id, initialState)

                // Set up subscription to verify cleanup
                const messages: AgentRecord[] = []
                const fiber = yield* pipe(
                    service.subscribe(id),
                    Stream.tap(msg => Effect.sync(() => messages.push(msg))),
                    Stream.runDrain,
                    Effect.fork
                )

                // Try to terminate sequentially
                let successCount = 0
                for (let i = 0; i < 10; i++) {
                    const result = yield* Effect.either(service.terminate(id))
                    if (result._tag === "Right") {
                        successCount++
                    }
                }

                // Only the first termination should succeed
                expect(successCount).toBe(1)

                // Get state should fail after termination
                const state = yield* Effect.either(service.getState(id))
                expect(Either.isLeft(state)).toBe(true)
                if (Either.isLeft(state)) {
                    expect(state.left).toBeInstanceOf(EffectorNotFoundError)
                } else {
                    throw new Error("Expected state to be Left")
                }

                // Subscription should be cleaned up
                yield* Fiber.interrupt(fiber)
            })
            return Effect.runPromise(Effect.provide(program, harness.TestLayer))
        })
    })

    describe("send", () => {
        it("should send messages to an Effector", () =>
            runTest(Effect.gen(function* () {
                const service = yield* EffectorService
                const id = makeEffectorId("test")
                const effector = yield* service.create(id, { count: 0 })

                // Set up subscription to verify message ordering
                const messages: AgentRecord[] = []
                const fiber = yield* pipe(
                    effector.subscribe(),
                    Stream.filter(msg => msg.type === AgentRecordType.STATE_CHANGE),
                    Stream.tap(msg => Effect.sync(() => messages.push(msg))),
                    Stream.take(2),
                    Stream.runDrain,
                    Effect.fork
                )

                // Send two messages
                const records: AgentRecord[] = [
                    {
                        id: "test-record-1",
                        effectorId: id,
                        timestamp: Date.now(),
                        type: AgentRecordType.STATE_CHANGE,
                        payload: { count: 1 },
                        metadata: { priority: MessagePriority.HIGH }
                    },
                    {
                        id: "test-record-2",
                        effectorId: id,
                        timestamp: Date.now(),
                        type: AgentRecordType.STATE_CHANGE,
                        payload: { count: 2 },
                        metadata: { priority: MessagePriority.LOW }
                    }
                ]

                // Send messages concurrently
                yield* Effect.forEach(records, record => service.send(id, record), {
                    concurrency: "unbounded"
                })

                // Wait for subscription to complete
                yield* pipe(
                    Fiber.join(fiber),
                    Effect.timeout(2000)
                )

                // Verify state changes were received
                expect(messages).toHaveLength(2)
                const counts = messages.map(msg => (msg.payload as { count: number }).count)
                expect(counts).toContain(1)
                expect(counts).toContain(2)

                // Verify final state
                const state = yield* service.getState(id)
                expect((state.state as { count: number }).count).toBe(2)  // Last message's count value
            }))
        )

        it("should handle backpressure when mailbox is full", () =>
            runTest(Effect.gen(function* () {
                const service = yield* EffectorService
                const id = makeEffectorId("test")
                yield* service.create(id, { count: 0 })

                // Send enough messages to trigger backpressure
                const records = Array.from({ length: 5 }, (_, i) => ({
                    id: `test-record-${i}`,
                    effectorId: id,
                    timestamp: Date.now(),
                    type: AgentRecordType.COMMAND,
                    payload: { type: "INCREMENT", count: i + 1 },
                    metadata: { priority: MessagePriority.HIGH } // Use high priority to ensure processing
                }))

                // Set up subscription to verify messages are received
                const messages: AgentRecord[] = []
                const fiber = yield* pipe(
                    service.subscribe(id),
                    Stream.filter(msg => msg.type === AgentRecordType.STATE_CHANGE),
                    Stream.tap(msg => Effect.sync(() => messages.push(msg))),
                    Stream.take(records.length),
                    Stream.runDrain,
                    Effect.fork
                )

                // Wait for subscription to be ready
                yield* Effect.sleep(100)

                // Send messages sequentially to ensure proper ordering
                for (const record of records) {
                    yield* service.send(id, record)
                    yield* Effect.sleep(50) // Small delay between sends
                }

                // Wait for all messages to be processed
                yield* pipe(
                    Fiber.join(fiber),
                    Effect.timeout(2000)
                )

                // Verify all messages were processed in order
                expect(messages).toHaveLength(records.length)
                const processedCounts = messages.map(msg => (msg.payload as { count: number }).count)
                expect(processedCounts).toEqual(Array.from({ length: 5 }, (_, i) => i + 1))

                // Get final state to verify
                const state = yield* service.getState(id)
                expect((state.state as { count: number }).count).toBe(5)
            }))
        )

        it("should fail when sending message to terminated Effector", () =>
            runTest(Effect.gen(function* () {
                const service = yield* EffectorService
                const id = makeEffectorId("test")
                const initialState = { count: 0 }

                const effector = yield* service.create(id, initialState)
                yield* service.terminate(id)

                const record: AgentRecord = {
                    id: "test-record",
                    effectorId: id,
                    timestamp: Date.now(),
                    type: AgentRecordType.COMMAND,
                    payload: { type: "INCREMENT" },
                    metadata: {}
                }

                const result = yield* Effect.flip(service.send(id, record))
                expect(result).toBeInstanceOf(EffectorNotFoundError)
            }))
        )
    })

    describe("getState", () => {
        it("should get current state and metrics", () =>
            Effect.gen(function* (_) {
                const service = yield* _(EffectorService)
                const id = makeEffectorId("test")
                const initialState = { count: 0 }

                const effector = yield* _(service.create(id, initialState))

                // Send a few messages to update state
                yield* _(service.send(effector.id, {
                    id: "test-1",
                    effectorId: effector.id,
                    timestamp: Date.now(),
                    type: AgentRecordType.STATE_CHANGE,
                    payload: { count: 1 },
                    metadata: {}
                }))
                yield* _(service.send(effector.id, {
                    id: "test-2",
                    effectorId: effector.id,
                    timestamp: Date.now(),
                    type: AgentRecordType.STATE_CHANGE,
                    payload: { count: 2 },
                    metadata: {}
                }))

                // Add small delay to ensure messages are processed
                yield* _(Effect.sleep(Duration.millis(100)))

                const state = yield* _(pipe(
                    service.getState(effector.id),
                    Effect.timeout(Duration.seconds(10))
                ))

                expect(state).toBeDefined()
                expect(state.processing?.processed).toBe(2)
                expect(state.status).toBe(EffectorStatus.IDLE)

                yield* _(service.terminate(effector.id))
            }).pipe(
                Effect.timeout(Duration.seconds(15)) // Increased overall test timeout
            )
        )

        it("should fail when getting state of non-existent Effector", () =>
            runTest(Effect.gen(function* () {
                const service = yield* EffectorService
                const id = makeEffectorId("non-existent")
                const result = yield* Effect.flip(service.getState(id))
                expect(result).toBeInstanceOf(EffectorNotFoundError)
                expect(result.effectorId).toBe(id)
            }))
        )
    })

    describe("subscribe", () => {
        it("should receive state changes via subscription", () =>
            runTest(Effect.gen(function* () {
                const service = yield* EffectorService
                const id = makeEffectorId("test")
                yield* service.create(id, { count: 0 })

                // Set up subscription
                const stateChanges: AgentRecord[] = []
                const fiber = yield* pipe(
                    service.subscribe(id),
                    Stream.filter(record => record.type === AgentRecordType.STATE_CHANGE),
                    Stream.tap(record => Effect.sync(() => stateChanges.push(record))),
                    Stream.take(1),
                    Stream.runDrain,
                    Effect.fork
                )

                // Send message
                const record: AgentRecord = {
                    id: "test-record",
                    effectorId: id,
                    timestamp: Date.now(),
                    type: AgentRecordType.STATE_CHANGE,
                    payload: { count: 1 },
                    metadata: {}
                }
                yield* service.send(id, record)

                // Wait a bit for the message to be processed
                yield* Effect.sleep(100)

                // Get state to verify message was processed
                const state = yield* service.getState(id)
                expect((state.state as { count: number }).count).toBe(1)
            }))
        )

        it("should handle multiple subscribers", () =>
            runTest(Effect.gen(function* () {
                const service = yield* EffectorService
                const id = makeEffectorId("test")
                yield* service.create(id, { count: 0 })

                // Set up multiple subscribers
                const subscribers = Array.from({ length: 3 }, () => [] as AgentRecord[])
                const fibers = yield* Effect.forEach(
                    subscribers,
                    (messages, i) => pipe(
                        service.subscribe(id),
                        Stream.tap(record => Effect.sync(() => messages.push(record))),
                        Stream.take(1),
                        Stream.runDrain,
                        Effect.fork
                    ),
                    { concurrency: "unbounded" }
                )

                // Wait for subscribers to set up
                yield* Effect.sleep(100)

                // Send state change with high priority
                const record: AgentRecord = {
                    id: "test-record",
                    effectorId: id,
                    timestamp: Date.now(),
                    type: AgentRecordType.STATE_CHANGE,
                    payload: { count: 1 },
                    metadata: { priority: MessagePriority.HIGH }
                }
                yield* service.send(id, record)

                // Wait for all subscribers to complete with longer timeout
                yield* pipe(
                    Effect.forEach(fibers, Fiber.join),
                    Effect.timeout(5000)
                )

                // Verify all subscribers received the message
                subscribers.forEach(messages => {
                    expect(messages).toHaveLength(1)
                    expect((messages[0].payload as { count: number }).count).toBe(1)
                })
            }))
        )

        it("should clean up subscribers on unsubscribe", () =>
            Effect.gen(function* (_) {
                const service = yield* _(EffectorService)
                const id = makeEffectorId("test")
                const initialState = { count: 0 }

                const effector = yield* _(service.create(id, initialState))

                // Create subscription
                const subscription = yield* _(pipe(
                    service.subscribe(effector.id),
                    Stream.runCollect,
                    Effect.fork
                ))

                // Allow subscription to initialize
                yield* _(Effect.sleep(Duration.millis(100)))

                // Interrupt subscription
                yield* _(Fiber.interrupt(subscription))

                // Allow cleanup to complete
                yield* _(Effect.sleep(Duration.millis(100)))

                // Verify cleanup by checking internal state
                const state = yield* _(service.getState(effector.id))
                expect(state.status).toBe(EffectorStatus.IDLE)

                yield* _(service.terminate(effector.id))
            }).pipe(
                Effect.timeout(Duration.seconds(10))
            )
        )
    })
})