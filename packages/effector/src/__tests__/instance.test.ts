import { Effect, Queue, Ref, Stream, pipe } from "effect"
import { describe, expect, it } from "vitest"
import { EffectorInstance } from "../instance.js"
import { EffectorStatus } from "../types.js"
import type { AgentRecord, EffectorId, EffectorState } from "../types.js"
import { AgentRecordType, makeEffectorId } from "../types.js"

describe("EffectorInstance", () => {
    describe("create", () => {
        it("should create a new instance with initial state", () =>
            Effect.gen(function* () {
                const id = makeEffectorId("test")
                const initialState = { count: 0 }
                const config = {
                    size: 1000,
                    enablePrioritization: true,
                    priorityQueueSize: 100,
                    backpressureTimeout: 5000
                }

                const instance = yield* EffectorInstance.create(
                    id,
                    initialState,
                    (record: AgentRecord, state: { count: number }) => Effect.succeed(state),
                    config
                )

                const state = yield* instance.getState()
                expect(state.id).toBe(id)
                expect(state.state).toEqual(initialState)
                expect(state.status).toBe(EffectorStatus.IDLE)
                expect(state.processing).toBeDefined()
                if (state.processing) {
                    expect(state.processing).toEqual({
                        processed: 0,
                        failures: 0,
                        avgProcessingTime: 0
                    })
                }
            })
        )
    })

    describe("processing", () => {
        it("should process messages and update state", () =>
            Effect.gen(function* () {
                const id = makeEffectorId("test")
                const initialState = { count: 0 }
                const config = {
                    size: 1000,
                    enablePrioritization: true,
                    priorityQueueSize: 100,
                    backpressureTimeout: 5000
                }

                const instance = yield* EffectorInstance.create(
                    id,
                    initialState,
                    (record: AgentRecord, state: { count: number }) => 
                        Effect.succeed({ count: state.count + 1 }),
                    config
                )

                // Start processing
                yield* instance.startProcessing()

                // Send a message
                const record: AgentRecord = {
                    id: "test-record",
                    effectorId: id,
                    timestamp: Date.now(),
                    type: AgentRecordType.COMMAND,
                    payload: { type: "INCREMENT" },
                    metadata: {}
                }
                yield* instance.send(record)

                // Wait for processing
                yield* Effect.sleep(100)

                // Check state
                const state = yield* instance.getState()
                expect(state.state.count).toBe(1)
                expect(state.processing).toBeDefined()
                if (state.processing) {
                    expect(state.processing.processed).toBe(1)
                    expect(state.processing.failures).toBe(0)
                }
            })
        )

        it("should handle processing errors", () =>
            Effect.gen(function* () {
                const id = makeEffectorId("test")
                const initialState = { count: 0 }
                const config = {
                    size: 1000,
                    enablePrioritization: true,
                    priorityQueueSize: 100,
                    backpressureTimeout: 5000
                }

                const instance = yield* EffectorInstance.create(
                    id,
                    initialState,
                    (_record: AgentRecord, _state: { count: number }) => 
                        Effect.fail(new Error("Test error")),
                    config
                )

                // Start processing
                yield* instance.startProcessing()

                // Send a message
                const record: AgentRecord = {
                    id: "test-record",
                    effectorId: id,
                    timestamp: Date.now(),
                    type: AgentRecordType.COMMAND,
                    payload: { type: "INCREMENT" },
                    metadata: {}
                }
                yield* instance.send(record)

                // Wait for processing
                yield* Effect.sleep(100)

                // Check state
                const state = yield* instance.getState()
                expect(state.state.count).toBe(0) // State unchanged
                expect(state.status).toBe(EffectorStatus.ERROR)
                expect(state.error).toBeDefined()
                expect(state.processing).toBeDefined()
                if (state.processing) {
                    expect(state.processing.processed).toBe(0)
                    expect(state.processing.failures).toBe(1)
                }
            })
        )
    })

    describe("subscription", () => {
        it("should receive messages via subscription", () =>
            Effect.gen(function* () {
                const id = makeEffectorId("test")
                const initialState = { count: 0 }
                const config = {
                    size: 1000,
                    enablePrioritization: true,
                    priorityQueueSize: 100,
                    backpressureTimeout: 5000
                }

                const instance = yield* EffectorInstance.create(
                    id,
                    initialState,
                    (record: AgentRecord, state: { count: number }) => Effect.succeed(state),
                    config
                )

                // Create a promise to resolve when we receive the message
                let resolve: (value: AgentRecord) => void
                const received = new Promise<AgentRecord>(r => resolve = r)

                // Set up subscription to resolve promise on first message
                const subscription = pipe(
                    instance.subscribe(),
                    Stream.tap(message => Effect.sync(() => resolve(message))),
                    Stream.take(1)
                )

                // Start consuming the stream
                yield* Stream.runDrain(subscription)

                // Send test message
                const record: AgentRecord = {
                    id: "test-record",
                    effectorId: id,
                    timestamp: Date.now(),
                    type: AgentRecordType.EVENT,
                    payload: { value: 1 },
                    metadata: {}
                }
                yield* instance.send(record)

                // Wait for message and verify
                const value = yield* Effect.promise(() => received)
                expect(value).toEqual(record)
            })
        )
    })

    describe("termination", () => {
        it("should terminate instance and clean up", () =>
            Effect.gen(function* () {
                const id = makeEffectorId("test")
                const initialState = { count: 0 }
                const config = {
                    size: 1000,
                    enablePrioritization: true,
                    priorityQueueSize: 100,
                    backpressureTimeout: 5000
                }

                const instance = yield* EffectorInstance.create(
                    id,
                    initialState,
                    (record: AgentRecord, state: { count: number }) => Effect.succeed(state),
                    config
                )

                // Start processing
                const fiber = yield* instance.startProcessing()

                // Terminate
                yield* instance.terminate()

                // Check state
                const state = yield* instance.getState()
                expect(state.status).toBe(EffectorStatus.TERMINATED)

                // Try to send message after termination
                const record: AgentRecord = {
                    id: "test-record",
                    effectorId: id,
                    timestamp: Date.now(),
                    type: AgentRecordType.COMMAND,
                    payload: { type: "INCREMENT" },
                    metadata: {}
                }

                const sendResult = yield* Effect.either(instance.send(record))
                expect(sendResult._tag).toBe("Left")
            })
        )
    })
})
