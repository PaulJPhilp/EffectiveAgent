import { Effect, Either, Ref } from "effect"
import { describe, expect, it } from "vitest"
import {
    AgentRecord,
    AgentRecordType,
    AgentRuntimeError,
    AgentRuntimeService,
    AgentRuntimeStatus,
    makeAgentRuntimeId
} from "../index.js"

// Helper to run test Effects
const runTest = <E, A>(effect: Effect.Effect<A, E>): Promise<A> =>
    Effect.runPromise(effect)

// Helper to check if an Effect failed
const didFail = async (effect: Effect.Effect<unknown>): Promise<boolean> => {
    try {
        const result = await Effect.runPromise(effect)
        return Effect.isFailure(result as Effect.Effect<unknown, unknown>) as unknown as boolean
    } catch {
        return false
    }
}

// Helper to check if an effect will fail
const willFail = async <E, A>(effect: Effect.Effect<A, E>): Promise<boolean> => {
    const result = await Effect.runPromise(Effect.either(effect))
    return Either.isLeft(result as Either.Either<unknown, unknown>) as unknown as boolean
}

describe("AgentRuntimeService", () => {
    describe("create", () => {
        it("should create a new AgentRuntime with initial state", () =>
            runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test")
                const initialState = { count: 0 }

                const runtime = yield* service.create(id, initialState)
                expect(runtime.id).toBe(id)

                const state = yield* runtime.getState()
                expect(state.state).toEqual(initialState)
                expect(state.status).toBe(AgentRuntimeStatus.IDLE)
                expect(state.processing).toBeDefined()
                expect(state.processing?.processed).toBe(0)
                expect(state.processing?.failures).toBe(0)
            }))
        )

        it("should fail when creating an AgentRuntime with existing ID", () =>
            runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test")
                const initialState = { count: 0 }

                yield* service.create(id, initialState)
                const result = yield* Effect.flip(service.create(id, initialState))
                expect(result).toBeInstanceOf(AgentRuntimeError)
                expect(result.agentRuntimeId).toBe(id)
            }))
        )
    })

    describe("send", () => {
        it("should send records to a running AgentRuntime", () =>
            runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test")
                const initialState = { count: 0 }

                const runtime = yield* service.create(id, initialState)

                const record: AgentRecord = {
                    id: "test-record",
                    agentRuntimeId: id,
                    timestamp: Date.now(),
                    type: AgentRecordType.STATE_CHANGE,
                    payload: { count: 1 },
                    metadata: {}
                }

                yield* service.send(id, record)
                const state = yield* runtime.getState()
                expect(state.state.count).toBe(1)
            }))
        )

        it("should handle errors when sending to non-existent AgentRuntime", () =>
            runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test")

                const record: AgentRecord = {
                    id: "test-record",
                    agentRuntimeId: id,
                    timestamp: Date.now(),
                    type: AgentRecordType.COMMAND,
                    payload: { type: "TEST" },
                    metadata: {}
                }

                const result = yield* Effect.flip(service.send(id, record))
                expect(result).toBeDefined()
                expect(result.message).toContain("not found")
            }))
        )
    })

    describe("subscribe", () => {
        it("should receive state change records from a running AgentRuntime", () =>
            runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test")
                const initialState = { count: 0 }

                const runtime = yield* service.create(id, initialState)

                // Create a ref to store received records
                const records = yield* Ref.make<AgentRecord[]>([])

                // Subscribe to records
                yield* pipe(
                    runtime.subscribe(),
                    Stream.tap(record =>
                        Ref.update(records, list => [...list, record])
                    ),
                    Stream.take(1),
                    Stream.runDrain,
                    Effect.fork
                )

                // Send a state change
                const record: AgentRecord = {
                    id: "test-record",
                    agentRuntimeId: id,
                    timestamp: Date.now(),
                    type: AgentRecordType.STATE_CHANGE,
                    payload: { count: 1 },
                    metadata: {}
                }

                yield* service.send(id, record)

                // Wait a bit for record to be processed
                yield* Effect.sleep(100)

                // Check received records
                const received = yield* Ref.get(records)
                expect(received).toHaveLength(1)
                expect(received[0].type).toBe(AgentRecordType.STATE_CHANGE)
                expect(received[0].payload).toEqual({ count: 1 })
            }))
        )
    })

    describe("terminate", () => {
        it("should clean up resources when terminating an AgentRuntime", () =>
            runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test")
                const initialState = { count: 0 }

                const runtime = yield* service.create(id, initialState)
                yield* service.terminate(id)

                const record: AgentRecord = {
                    id: "test-record",
                    agentRuntimeId: id,
                    timestamp: Date.now(),
                    type: AgentRecordType.COMMAND,
                    payload: { type: "INCREMENT" },
                    metadata: {}
                }

                const result = yield* Effect.flip(service.send(id, record))
                expect(result).toBeDefined()
                expect(result.message).toContain("not found")
            }))
        )
    })
})