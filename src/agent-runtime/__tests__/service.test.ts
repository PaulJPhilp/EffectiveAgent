import { createServiceTestHarness } from "@/services/core/test-harness/utils/service-test.js"
import { Effect, Ref, Stream, pipe } from "effect"
import { describe, expect, it } from "vitest"
import {
    AgentActivity,
    AgentActivityType,
    AgentRuntimeError,
    AgentRuntimeId,
    AgentRuntimeService,
    AgentRuntimeStatus,
    makeAgentRuntimeId
} from "../index.js"

const serviceHarness = createServiceTestHarness(
    AgentRuntimeService,
    () => Effect.succeed({
        create: <S>(id: AgentRuntimeId, initialState: S) => Effect.succeed({
            id,
            send: (_activity: AgentActivity) => Effect.succeed(void 0),
            getState: () => Effect.succeed({
                id,
                state: initialState,
                status: AgentRuntimeStatus.IDLE,
                lastUpdated: Date.now(),
                processing: { processed: 0, failures: 0, avgProcessingTime: 0 }
            }),
            subscribe: () => Stream.empty
        }),
        terminate: (id: AgentRuntimeId) => Effect.succeed(void 0),
        send: (id: AgentRuntimeId, _activity: AgentActivity) => Effect.succeed(void 0),
        getState: <S>(id: AgentRuntimeId) => Effect.succeed({
            id,
            state: { count: 0 } as S,
            status: AgentRuntimeStatus.IDLE,
            lastUpdated: Date.now(),
            processing: { processed: 0, failures: 0, avgProcessingTime: 0 }
        }),
        subscribe: (id: AgentRuntimeId) => Stream.empty
    })
)

describe("AgentRuntimeService", () => {
    describe("create", () => {
        it("should create a new AgentRuntime with initial state", () =>
            serviceHarness.runTest(Effect.gen(function* () {
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
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test")
                const initialState = { count: 0 }

                yield* service.create(id, initialState)
                const result = yield* Effect.flip(service.create(id, initialState))
                expect(result).toBeInstanceOf(AgentRuntimeError)
                if (result instanceof AgentRuntimeError) {
                    expect(result.agentRuntimeId).toBe(id)
                }
            }))
        )
    })

    describe("send", () => {
        it("should handle state change activities", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test")
                const initialState = { count: 0 }

                const runtime = yield* service.create(id, initialState)

                const activity: AgentActivity = {
                    id: "test-activity",
                    agentRuntimeId: id,
                    timestamp: Date.now(),
                    type: AgentActivityType.STATE_CHANGE,
                    payload: { count: 1 },
                    metadata: {},
                    sequence: 0
                }

                yield* service.send(id, activity)
                const state = yield* runtime.getState()
                expect(state.state.count).toBe(1)
                expect(state.processing?.processed).toBe(1)
                expect(state.processing?.failures).toBe(0)
            }))
        )

        it("should handle command activities", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test")
                const initialState = { count: 0 }

                const runtime = yield* service.create(id, initialState)

                const activity: AgentActivity = {
                    id: "test-activity",
                    agentRuntimeId: id,
                    timestamp: Date.now(),
                    type: AgentActivityType.COMMAND,
                    payload: { type: "TEST" },
                    metadata: {},
                    sequence: 0
                }

                yield* service.send(id, activity)
                const state = yield* runtime.getState()
                expect(state.status).toBe(AgentRuntimeStatus.ERROR)
                expect(state.processing?.failures).toBe(1)
                expect(state.error).toBeDefined()
            }))
        )

        it("should handle concurrent state changes", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test")
                const initialState = { count: 0 }

                const runtime = yield* service.create(id, initialState)

                // Send multiple concurrent state changes
                const activities = Array.from({ length: 10 }, (_, i) => ({
                    id: `test-activity-${i}`,
                    agentRuntimeId: id,
                    timestamp: Date.now(),
                    type: AgentActivityType.STATE_CHANGE,
                    payload: { count: i + 1 },
                    metadata: {},
                    sequence: i
                }))

                yield* Effect.forEach(
                    activities,
                    activity => service.send(id, activity),
                    { concurrency: "unbounded" }
                )

                // Wait for processing to complete
                yield* Effect.sleep(100)

                const state = yield* runtime.getState()
                expect(state.processing?.processed).toBe(10)
                expect(state.processing?.failures).toBe(0)
                expect(state.state.count).toBeGreaterThan(0)
            }))
        )

        it("should handle invalid state changes", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test")
                const initialState = { count: 0 }

                const runtime = yield* service.create(id, initialState)

                const activity: AgentActivity = {
                    id: "test-activity",
                    agentRuntimeId: id,
                    timestamp: Date.now(),
                    type: AgentActivityType.STATE_CHANGE,
                    payload: undefined,
                    metadata: {},
                    sequence: 0
                }

                yield* service.send(id, activity)
                const state = yield* runtime.getState()
                expect(state.status).toBe(AgentRuntimeStatus.ERROR)
                expect(state.processing?.failures).toBe(1)
                expect(state.error).toBeDefined()
            }))
        )
    })

    describe("subscribe", () => {
        it("should receive activities in priority order", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test")
                const initialState = { count: 0 }

                const runtime = yield* service.create(id, initialState)

                // Create a ref to store received activities
                const activities = yield* Ref.make<AgentActivity[]>([])

                // Subscribe to activities
                yield* pipe(
                    runtime.subscribe(),
                    Stream.tap(activity =>
                        Ref.update(activities, list => [...list, activity])
                    ),
                    Stream.take(3),
                    Stream.runDrain,
                    Effect.fork
                )

                // Send activities with different priorities
                const toSend: AgentActivity[] = [
                    {
                        id: "test-1",
                        agentRuntimeId: id,
                        timestamp: Date.now(),
                        type: AgentActivityType.STATE_CHANGE,
                        payload: { count: 1 },
                        metadata: { priority: 2 as any },
                        sequence: 0
                    },
                    {
                        id: "test-2",
                        agentRuntimeId: id,
                        timestamp: Date.now(),
                        type: AgentActivityType.STATE_CHANGE,
                        payload: { count: 2 },
                        metadata: { priority: 0 as any },
                        sequence: 1
                    },
                    {
                        id: "test-3",
                        agentRuntimeId: id,
                        timestamp: Date.now(),
                        type: AgentActivityType.STATE_CHANGE,
                        payload: { count: 3 },
                        metadata: { priority: 1 as any },
                        sequence: 2
                    }
                ]

                yield* Effect.forEach(
                    toSend,
                    activity => service.send(id, activity),
                    { concurrency: "unbounded" }
                )

                // Wait for processing
                yield* Effect.sleep(100)

                // Check received activities
                const received = yield* Ref.get(activities)
                expect(received).toHaveLength(3)
                expect(received[0]!.metadata.priority).toBe(0) // High priority first
                expect(received[1]!.metadata.priority).toBe(1)
                expect(received[2]!.metadata.priority).toBe(2)
            }))
        )
    })

    describe("terminate", () => {
        it("should clean up resources when terminating an AgentRuntime", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test")
                const initialState = { count: 0 }

                const runtime = yield* service.create(id, initialState)

                // Send an activity before termination
                const activity: AgentActivity = {
                    id: "test-activity",
                    agentRuntimeId: id,
                    timestamp: Date.now(),
                    type: AgentActivityType.STATE_CHANGE,
                    payload: { count: 1 },
                    metadata: {},
                    sequence: 0
                }

                yield* service.send(id, activity)
                yield* Effect.sleep(50) // Wait for processing

                // Terminate
                yield* service.terminate(id)

                // Verify cleanup
                const sendResult = yield* Effect.flip(service.send(id, activity))
                expect(sendResult).toBeDefined()
                expect(sendResult.message).toContain("not found")

                const stateResult = yield* Effect.flip(runtime.getState())
                expect(stateResult).toBeDefined()
                expect(stateResult.message).toContain("not found")

                const subscribeResult = yield* Effect.flip(Effect.promise(() =>
                    Stream.runCollect(runtime.subscribe()).pipe(
                        Effect.runPromise
                    )
                ))
                expect(subscribeResult).toBeInstanceOf(Error)
                expect((subscribeResult as Error).message).toContain("not found")
            }))
        )

        it("should handle termination of non-existent runtime", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test")

                const result = yield* Effect.flip(service.terminate(id))
                expect(result).toBeDefined()
                expect(result.message).toContain("not found")
            }))
        )
    })
})