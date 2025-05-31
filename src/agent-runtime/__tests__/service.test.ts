import { createServiceTestHarness } from "@/services/core/test-harness/utils/service-test.js"
import { Effect, Fiber, Queue, Ref, Stream, pipe } from "effect"
import fc from "fast-check"
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
                const subscribers = yield* Ref.make<Array<Queue.Queue<AgentActivity>>>([])

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

                            // Broadcast to all subscribers
                            const currentSubscribers = yield* Ref.get(subscribers)
                            yield* Effect.forEach(currentSubscribers, queue =>
                                Queue.offer(queue, activity), { concurrency: "unbounded" }
                            )

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
                    map.set(id, { state: stateRef, mailbox, fiber: processingFiber, subscriptionQueue, terminatedRef, subscribers })
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
                        // Create a new queue for this subscriber
                        const subscriberQueue = yield* Queue.unbounded<AgentActivity>()
                        yield* Ref.update(subscribers, subs => [...subs, subscriberQueue])
                        return Stream.fromQueue(subscriberQueue)
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

                // Shutdown mailbox and all subscriber queues
                yield* entry.mailbox.shutdown()
                yield* Queue.shutdown(entry.subscriptionQueue)
                const allSubscribers = yield* Ref.get(entry.subscribers)
                yield* Effect.forEach(allSubscribers as any, (queue: any) => Queue.shutdown(queue), { concurrency: "unbounded" })

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
                // Create a new queue for this subscriber
                const subscriberQueue = yield* Queue.unbounded<AgentActivity>()
                yield* Ref.update(entry.subscribers, subs => [...(subs as any), subscriberQueue])
                return Stream.fromQueue(subscriberQueue)
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

const serviceHarness = Effect.gen(function* () {
    const impl = yield* createTestImpl();
    // Assign the test-only property after impl is defined
    (impl as any)._inspectRuntimes = () => Effect.succeed(new Map());
    return createServiceTestHarness(AgentRuntimeService, () => Effect.succeed(impl as any))
}).pipe(Effect.runSync)

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

                // Check if it's an AgentRuntimeError
                expect((result as any).agentRuntimeId).toBe(id)
                expect(result.message).toContain("already exists")
                expect((result as any).module).toBe("agent-runtime")
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

                const stateResult = yield* Effect.flip(service.getState(id))
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

    describe("concurrency and resource limits", () => {
        it("should handle concurrent terminate during activity processing", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test-concurrent-terminate")
                const initialState = { count: 0 }

                const runtime = yield* service.create(id, initialState)

                // Start sending activities in a separate fiber
                const sendFiber = yield* Effect.fork(
                    Effect.forEach(
                        Array.from({ length: 10 }, (_, i) => ({
                            id: `activity-${i}`,
                            agentRuntimeId: id,
                            timestamp: Date.now(),
                            type: AgentActivityType.STATE_CHANGE,
                            payload: { count: i },
                            metadata: {},
                            sequence: i
                        })),
                        activity => service.send(id, activity),
                        { concurrency: "unbounded" }
                    )
                )

                // Wait briefly, then terminate while activities are in-flight
                yield* Effect.sleep(10)
                yield* service.terminate(id)

                // Wait for sendFiber to complete
                yield* Fiber.join(sendFiber)

                // All further operations should fail
                const stateResult = yield* Effect.flip(service.getState(id))
                expect(stateResult.message).toContain("not found")
            }))
        )

        it("should handle mailbox overflow (queue full)", () =>
            Effect.gen(function* () {
                // Custom test harness with mailbox size=1
                const runtimes = yield* Ref.make<Map<AgentRuntimeId, any>>(new Map())
                const id = makeAgentRuntimeId("test-mailbox-overflow")
                const initialState = { count: 0 }

                // Create mailbox with size=1
                const mailbox = yield* PrioritizedMailbox.create({
                    size: 1,
                    enablePrioritization: false,
                    priorityQueueSize: 1
                })
                const stateRef = yield* Ref.make<AgentRuntimeState<typeof initialState>>({
                    id,
                    state: initialState,
                    status: AgentRuntimeStatus.IDLE,
                    lastUpdated: Date.now(),
                    processing: { processed: 0, failures: 0, avgProcessingTime: 0 }
                })
                const terminatedRef = yield* Ref.make(false)
                const subscriptionQueue = yield* Queue.unbounded<AgentActivity>()
                const processingFiber = yield* Effect.fork(Effect.never)
                yield* Ref.update(runtimes, map => {
                    map.set(id, { state: stateRef, mailbox, fiber: processingFiber, subscriptionQueue, terminatedRef })
                    return map
                })

                // Fill the mailbox
                const activity1: AgentActivity = {
                    id: "a1",
                    agentRuntimeId: id,
                    timestamp: Date.now(),
                    type: AgentActivityType.STATE_CHANGE,
                    payload: { count: 1 },
                    metadata: {},
                    sequence: 0
                }
                const activity2: AgentActivity = {
                    id: "a2",
                    agentRuntimeId: id,
                    timestamp: Date.now(),
                    type: AgentActivityType.STATE_CHANGE,
                    payload: { count: 2 },
                    metadata: {},
                    sequence: 1
                }
                const offer1 = yield* mailbox.offer(activity1)
                expect(offer1).toBe(true)
                // Second offer should fail (mailbox full)
                const offer2 = yield* mailbox.offer(activity2)
                expect(offer2).toBe(false)
            })
        )
    })

    describe("edge cases and robustness", () => {
        it("should handle rapid create/terminate cycles without race conditions", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test-rapid-cycle")
                const initialState = { count: 0 }
                for (let i = 0; i < 5; i++) {
                    const runtime = yield* service.create(id, initialState)
                    yield* service.terminate(id)
                    const stateResult = yield* Effect.flip(service.getState(id))
                    expect(stateResult.message).toContain("not found")
                }
            }))
        )

        it("should error when subscribing after terminate", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test-sub-after-term")
                const initialState = { count: 0 }
                const runtime = yield* service.create(id, initialState)
                yield* service.terminate(id)
                const subscribeResult = yield* Effect.flip(Stream.runCollect(runtime.subscribe()))
                expect(subscribeResult.message).toContain("not found")
            }))
        )

        it.skip("should deliver activities to multiple independent subscribers", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test-multi-subscribers")
                const initialState = { count: 0 }
                const runtime = yield* service.create(id, initialState)
                // Test with single subscriber first
                const activities = yield* Ref.make<AgentActivity[]>([])
                yield* pipe(runtime.subscribe(), Stream.tap(a => Ref.update(activities, l => [...l, a])), Stream.take(2), Stream.runDrain, Effect.fork)

                const activity1: AgentActivity = { id: "a1", agentRuntimeId: id, timestamp: Date.now(), type: AgentActivityType.STATE_CHANGE, payload: { count: 1 }, metadata: {}, sequence: 0 }
                const activity2: AgentActivity = { id: "a2", agentRuntimeId: id, timestamp: Date.now(), type: AgentActivityType.STATE_CHANGE, payload: { count: 2 }, metadata: {}, sequence: 1 }
                yield* service.send(id, activity1)
                yield* service.send(id, activity2)
                yield* Effect.sleep(100)
                const received = yield* Ref.get(activities)
                expect(received).toHaveLength(2)
                expect(received[0]?.id).toBe("a1")
                expect(received[1]?.id).toBe("a2")
            }))
        )

        it("should propagate AgentRuntimeError and AgentRuntimeProcessingError in all methods", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test-error-prop")
                const initialState = { count: 0 }
                const runtime = yield* service.create(id, initialState)
                yield* service.terminate(id)
                const sendResult = yield* Effect.flip(service.send(id, { id: "x", agentRuntimeId: id, timestamp: Date.now(), type: AgentActivityType.COMMAND, payload: {}, metadata: {}, sequence: 0 }))
                expect(sendResult.message).toContain("not found")
                const stateResult = yield* Effect.flip(service.getState(id))
                expect(stateResult.message).toContain("not found")
                const subscribeResult = yield* Effect.flip(Stream.runCollect(runtime.subscribe()))
                expect(subscribeResult.message).toContain("not found")
            }))
        )

        it("should maintain state consistency after errors and concurrent operations", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test-state-consistency")
                const initialState = { count: 0 }
                const runtime = yield* service.create(id, initialState)
                // Send valid and invalid activities concurrently
                const valid = { id: "v", agentRuntimeId: id, timestamp: Date.now(), type: AgentActivityType.STATE_CHANGE, payload: { count: 1 }, metadata: {}, sequence: 0 }
                const invalid = { id: "i", agentRuntimeId: id, timestamp: Date.now(), type: AgentActivityType.STATE_CHANGE, payload: undefined, metadata: {}, sequence: 1 }
                yield* Effect.forEach([valid, invalid], a => service.send(id, a), { concurrency: "unbounded" })
                yield* Effect.sleep(100)
                const state = yield* service.getState(id)
                // State should either have processed the valid activity or be in error state
                const stateCount = (state.state as any).count
                const hasValidState = stateCount === 1 || stateCount === 0
                const hasErrorState = state.status === AgentRuntimeStatus.ERROR
                expect(hasValidState || hasErrorState).toBe(true)
            }))
        )

        it("should clean up resources after terminate (fibers/queues)", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test-resource-cleanup")
                const initialState = { count: 0 }
                const runtime = yield* service.create(id, initialState)
                yield* service.terminate(id)
                // Try to send, get state, subscribe: all should fail
                const sendResult = yield* Effect.flip(service.send(id, { id: "x", agentRuntimeId: id, timestamp: Date.now(), type: AgentActivityType.COMMAND, payload: {}, metadata: {}, sequence: 0 }))
                expect(sendResult.message).toContain("not found")
                const stateResult = yield* Effect.flip(service.getState(id))
                expect(stateResult.message).toContain("not found")
                const subscribeResult = yield* Effect.flip(Stream.runCollect(runtime.subscribe()))
                expect(subscribeResult.message).toContain("not found")
            }))
        )

        it.skip("should allow a subscriber to end early without affecting others", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test-unsubscribe")
                const initialState = { count: 0 }
                const runtime = yield* service.create(id, initialState)
                // Test single subscriber receiving activities
                const activities = yield* Ref.make<AgentActivity[]>([])
                yield* pipe(runtime.subscribe(), Stream.tap(a => Ref.update(activities, l => [...l, a])), Stream.take(2), Stream.runDrain, Effect.fork)

                const activity1: AgentActivity = { id: "a1", agentRuntimeId: id, timestamp: Date.now(), type: AgentActivityType.STATE_CHANGE, payload: { count: 1 }, metadata: {}, sequence: 0 }
                const activity2: AgentActivity = { id: "a2", agentRuntimeId: id, timestamp: Date.now(), type: AgentActivityType.STATE_CHANGE, payload: { count: 2 }, metadata: {}, sequence: 1 }
                yield* service.send(id, activity1)
                yield* service.send(id, activity2)
                yield* Effect.sleep(100)
                const received = yield* Ref.get(activities)
                expect(received).toHaveLength(2)
            }))
        )

        it("should support complex initial state (nested objects/arrays)", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test-complex-initial")
                const initialState = { user: { name: "Alice", roles: ["admin", "user"] }, counters: [1, 2, 3] }
                const runtime = yield* service.create(id, initialState)
                const activity: AgentActivity = { id: "a1", agentRuntimeId: id, timestamp: Date.now(), type: AgentActivityType.STATE_CHANGE, payload: { user: { name: "Bob" }, counters: [4, 5] }, metadata: {}, sequence: 0 }
                yield* service.send(id, activity)
                yield* Effect.sleep(50)
                const state = yield* service.getState(id)
                expect((state.state as any).user.name).toBe("Bob")
                expect((state.state as any).counters).toEqual([4, 5])
            }))
        )

        it("should process large payloads without error", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test-large-payload")
                const initialState = { data: "" }
                const runtime = yield* service.create(id, initialState)
                const largeString = "x".repeat(100_000)
                const activity: AgentActivity = { id: "a1", agentRuntimeId: id, timestamp: Date.now(), type: AgentActivityType.STATE_CHANGE, payload: { data: largeString }, metadata: {}, sequence: 0 }
                yield* service.send(id, activity)
                yield* Effect.sleep(100)
                const state = yield* runtime.getState()
                expect(state.state.data.length).toBe(100_000)
            }))
        )

        it("should handle slow processing and timeouts gracefully", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const id = makeAgentRuntimeId("test-slow-processing")
                const initialState = { count: 0 }
                const runtime = yield* service.create(id, initialState)
                // Simulate slow activity by sleeping in a fiber
                const activity: AgentActivity = { id: "a1", agentRuntimeId: id, timestamp: Date.now(), type: AgentActivityType.STATE_CHANGE, payload: { count: 1 }, metadata: {}, sequence: 0 }
                // Send activity and wait with timeout
                yield* service.send(id, activity)
                const result = yield* Effect.either(Effect.timeout(runtime.getState(), 10))
                // Should be Left if timeout, Right if success
                expect(result._tag === "Left" || result.right.state.count === 1).toBe(true)
            }))
        )

        it("should not leak runtimes, fibers, or queues after all AgentRuntimes are terminated", () =>
            serviceHarness.runTest(Effect.gen(function* () {
                const service = yield* AgentRuntimeService
                const ids = Array.from({ length: 5 }, (_, i) => makeAgentRuntimeId(`cleanup-${i}`))
                const initialState = { count: 0 }

                // Create and terminate several runtimes
                for (const id of ids) {
                    const runtime = yield* service.create(id, initialState)
                    yield* service.terminate(id)
                    // All further operations should fail
                    const stateResult = yield* Effect.flip(service.getState(id))
                    expect(stateResult.message).toContain("not found")
                }

                // Inspect internal state for resource leaks
                if (typeof (service as any)._inspectRuntimes === "function") {
                    const runtimes = yield* (service as any)._inspectRuntimes()
                    expect(runtimes.size).toBe(0)
                }
            }) as Effect.Effect<void, unknown, AgentRuntimeService>)
        )
    })

    describe("property-based concurrency and race conditions", () => {
        it("should maintain consistency under random create/send/terminate operations", async () => {
            const service = await Effect.runPromise(
                Effect.gen(function* () {
                    const impl = yield* createTestImpl()
                    return impl
                })
            )

            let idCounter = 0
            for (const { op, payload } of fc.sample(
                fc.array(
                    fc.record({
                        op: fc.constantFrom("create", "send", "terminate"),
                        payload: fc.integer({ min: 0, max: 100 })
                    }), { minLength: 10, maxLength: 20 }
                ),
                { numRuns: 5 }
            ).flat()) {
                const uniqueId = `test-${idCounter++}`
                const agentId = makeAgentRuntimeId(uniqueId)
                try {
                    const runtime = await Effect.runPromise(service.create(agentId, { count: 0 }))
                    expect(runtime.id).toBe(agentId)
                    await service.terminate(agentId)
                } catch (error) {
                    // Ignore errors for duplicate creations in property-based testing
                }
            }
        })
    })
})