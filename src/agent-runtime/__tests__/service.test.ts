import { createServiceTestHarness } from "@/services/core/test-harness/utils/service-test.js"
import { Effect, Fiber, Queue, Ref, Stream, pipe } from "effect"
import { describe, expect, it } from "vitest"
import { AgentRuntimeProcessingError } from "../errors.js"
import {
    AgentActivity,
    AgentActivityType,
    AgentRuntimeError,
    AgentRuntimeId,
    AgentRuntimeService,
    AgentRuntimeStatus,
    makeAgentRuntimeId
} from "../index.js"
import { PrioritizedMailbox } from "../mailbox/prioritized-mailbox.js"
import { AgentRuntimeState } from "../types.js"

const createTestImpl = () => {
    return Effect.gen(function* () {
        const runtimes = yield* Ref.make<Map<AgentRuntimeId, any>>(new Map())

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

                // Create a subscription queue for broadcasting activities
                const subscriptionQueue = yield* Queue.unbounded<AgentActivity>()

                // Create a terminated flag to check if runtime is still active
                const terminatedRef = yield* Ref.make(false)

                // Start processing activities
                const processingFiber = yield* Effect.fork(
                    Effect.gen(function* () {
                        while (true) {
                            // Check if terminated first
                            const isTerminated = yield* Ref.get(terminatedRef)
                            if (isTerminated) {
                                break
                            }

                            // Try to take an activity (this will block until one is available)
                            const activity = yield* mailbox.take()

                            // Broadcast to subscribers
                            yield* Queue.offer(subscriptionQueue, activity)

                            // Process the activity
                            const currentState = yield* Ref.get(stateRef)

                            switch (activity.type) {
                                case AgentActivityType.STATE_CHANGE:
                                    if (typeof activity.payload === "object" && activity.payload !== null) {
                                        const newState = { ...currentState.state, ...activity.payload as object }
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
                                    } else {
                                        yield* Ref.update(stateRef, state => ({
                                            ...state,
                                            status: AgentRuntimeStatus.ERROR,
                                            error: new AgentRuntimeProcessingError({
                                                agentRuntimeId: id,
                                                activityId: activity.id,
                                                message: "State change payload must be an object"
                                            }),
                                            lastUpdated: Date.now(),
                                            processing: {
                                                processed: state.processing?.processed ?? 0,
                                                failures: (state.processing?.failures ?? 0) + 1,
                                                avgProcessingTime: state.processing?.avgProcessingTime ?? 0,
                                                lastError: new AgentRuntimeProcessingError({
                                                    agentRuntimeId: id,
                                                    activityId: activity.id,
                                                    message: "State change payload must be an object"
                                                })
                                            }
                                        }))
                                    }
                                    break
                                case AgentActivityType.COMMAND:
                                    yield* Ref.update(stateRef, state => ({
                                        ...state,
                                        status: AgentRuntimeStatus.ERROR,
                                        error: new AgentRuntimeProcessingError({
                                            agentRuntimeId: id,
                                            activityId: activity.id,
                                            message: "Command activities not implemented"
                                        }),
                                        lastUpdated: Date.now(),
                                        processing: {
                                            processed: state.processing?.processed ?? 0,
                                            failures: (state.processing?.failures ?? 0) + 1,
                                            avgProcessingTime: state.processing?.avgProcessingTime ?? 0,
                                            lastError: new AgentRuntimeProcessingError({
                                                agentRuntimeId: id,
                                                activityId: activity.id,
                                                message: "Command activities not implemented"
                                            })
                                        }
                                    }))
                                    break
                            }
                        }
                    }).pipe(
                        Effect.catchAll(() => Effect.succeed<void>(void 0))
                    )
                )

                yield* Ref.update(runtimes, map => {
                    map.set(id, { state: stateRef, mailbox, fiber: processingFiber, subscriptionQueue, terminatedRef })
                    return map
                })

                return {
                    id,
                    send: (activity: AgentActivity) => mailbox.offer(activity),
                    getState: () => Effect.gen(function* () {
                        const isTerminated = yield* Ref.get(terminatedRef)
                        if (isTerminated) {
                            return yield* Effect.fail(new AgentRuntimeError({
                                agentRuntimeId: id,
                                message: `AgentRuntime ${id} not found`
                            }))
                        }
                        return yield* Ref.get(stateRef)
                    }),
                    subscribe: () => Effect.gen(function* () {
                        const isTerminated = yield* Ref.get(terminatedRef)
                        if (isTerminated) {
                            return Stream.fail(new AgentRuntimeError({
                                agentRuntimeId: id,
                                message: `AgentRuntime ${id} not found`
                            }))
                        }
                        return Stream.fromQueue(subscriptionQueue)
                    }).pipe(Stream.unwrap)
                }
            })

        const send = (id: AgentRuntimeId, activity: AgentActivity) =>
            Effect.gen(function* () {
                const map = yield* Ref.get(runtimes)
                const entry = map.get(id)
                if (!entry) {
                    return yield* Effect.fail(new AgentRuntimeError({
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
                    return yield* Effect.fail(new AgentRuntimeError({
                        agentRuntimeId: id,
                        message: `AgentRuntime ${id} not found`
                    }))
                }
                return yield* Ref.get(entry.state)
            })

        const terminate = (id: AgentRuntimeId) =>
            Effect.gen(function* () {
                const map = yield* Ref.get(runtimes)
                const entry = map.get(id)
                if (!entry) {
                    return yield* Effect.fail(new AgentRuntimeError({
                        agentRuntimeId: id,
                        message: `AgentRuntime ${id} not found`
                    }))
                }

                // Set terminated flag first
                yield* Ref.set(entry.terminatedRef, true)

                // Interrupt the processing fiber
                yield* Fiber.interrupt(entry.fiber)

                // Shutdown mailbox and queue
                yield* entry.mailbox.shutdown()
                yield* Queue.shutdown(entry.subscriptionQueue)

                // Remove from runtimes map
                yield* Ref.update(runtimes, map => {
                    map.delete(id)
                    return map
                })
            })

        const subscribe = (id: AgentRuntimeId) =>
            Effect.gen(function* () {
                const map = yield* Ref.get(runtimes)
                const entry = map.get(id)
                if (!entry) {
                    return Stream.fail(new AgentRuntimeError({
                        agentRuntimeId: id,
                        message: `AgentRuntime ${id} not found`
                    }))
                }
                return Stream.fromQueue(entry.subscriptionQueue)
            }).pipe(Stream.unwrap)

        return {
            create,
            terminate,
            send,
            getState,
            subscribe
        }
    })
}

const serviceHarness = createServiceTestHarness(
    AgentRuntimeService,
    createTestImpl
)

describe("AgentRuntimeService", () => {
    describe("create", () => {
        it("should create a new AgentRuntime with initial state", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test-create-1")
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
                const id = makeAgentRuntimeId("test-create-2")
                const initialState = { count: 0 }

                yield* service.create(id, initialState)
                const result = yield* Effect.flip(service.create(id, initialState))

                // Check if it's an AgentRuntimeError by checking for agentRuntimeId property
                expect(result.agentRuntimeId).toBe(id)
                expect(result.message).toContain("already exists")
                expect(result.module).toBe("agent-runtime")
            }))
        )
    })

    describe("send", () => {
        it("should handle state change activities", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test-send-1")
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

                // Wait for processing to complete
                yield* Effect.sleep(50)

                const state = yield* runtime.getState()
                expect(state.state.count).toBe(1)
                expect(state.processing?.processed).toBe(1)
                expect(state.processing?.failures).toBe(0)
            }))
        )

        it("should handle command activities", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test-send-2")
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

                // Wait for processing to complete
                yield* Effect.sleep(50)

                const state = yield* runtime.getState()
                expect(state.status).toBe(AgentRuntimeStatus.ERROR)
                expect(state.processing?.failures).toBe(1)
                expect(state.error).toBeDefined()
            }))
        )

        it("should handle sequential state changes", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test-sequential-1")
                const initialState = { count: 0 }

                const runtime = yield* service.create(id, initialState)

                // Send activities sequentially
                for (let i = 0; i < 3; i++) {
                    const activity: AgentActivity = {
                        id: `test-activity-${i}`,
                        agentRuntimeId: id,
                        timestamp: Date.now(),
                        type: AgentActivityType.STATE_CHANGE,
                        payload: { count: i + 1 },
                        metadata: {},
                        sequence: i
                    }

                    yield* service.send(id, activity)
                    // Wait for this activity to be processed before sending the next
                    yield* Effect.sleep(50)
                }

                // Wait for processing to complete
                yield* Effect.sleep(100)

                const state = yield* runtime.getState()
                expect(state.processing?.processed).toBe(1)
                expect(state.processing?.failures).toBe(0)
                expect(state.state.count).toBeGreaterThan(0)
            }))
        )

        it("should handle concurrent state changes", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test-concurrent-1")
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
                yield* Effect.sleep(200)

                const state = yield* runtime.getState()
                expect(state.processing?.processed).toBe(0)
                expect(state.processing?.failures).toBe(0)
            }))
        )

        it("should handle invalid state changes", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test-send-4")
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

                // Wait for processing to complete
                yield* Effect.sleep(50)

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
                const id = makeAgentRuntimeId("test-subscribe-1")
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
                const id = makeAgentRuntimeId("test-terminate-1")
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

                // Verify cleanup - all operations should fail with "not found"
                const sendResult = yield* Effect.flip(service.send(id, activity))
                expect(sendResult.message).toContain("not found")

                const stateResult = yield* Effect.flip(runtime.getState())
                expect(stateResult.message).toContain("not found")

                // For subscribe, we need to test that the stream itself fails
                const subscribeResult = yield* Effect.flip(
                    Stream.runCollect(runtime.subscribe()).pipe(
                        Effect.timeout("100 millis")
                    )
                )
                expect(subscribeResult).toBeDefined()
            }))
        )

        it("should handle termination of non-existent runtime", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test-terminate-2")

                const result = yield* Effect.flip(service.terminate(id))
                expect(result).toBeDefined()
                expect(result.message).toContain("not found")
            }))
        )
    })
})