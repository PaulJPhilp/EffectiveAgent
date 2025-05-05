import { ServiceTestHarness, createServiceTestHarness } from "@/services/core/test-harness/harness.js"
import { Effect, Stream } from "effect"
import { beforeAll, describe, expect, it } from "vitest"
import type { AgentRecord } from "../../../effector/types.js"
import { AgentRecordType, makeEffectorId } from "../../../effector/types.js"
import { createSupervisorEffector } from "../index.js"
import { SupervisorCommand, SupervisorEventType, SupervisorProcessState } from "../types.js"
import { createTaskEffector } from "./task-effector.js"

// Test harness instance
let harness: ServiceTestHarness

beforeAll(() => {
    harness = createServiceTestHarness()
})

describe("SupervisorEffector", () => {
    describe("basic workflow", () => {
        it("should manage a successful task sequence", async () => {
            const effect = Effect.gen(function* (_) {
                // Create supervisor and task effectors
                const supervisorId = "test-supervisor"
                const taskAId = makeEffectorId("task-a")
                const taskBId = makeEffectorId("task-b")
                const supervisor = yield* createSupervisorEffector(supervisorId)

                // Collect state change events
                const stateChanges: AgentRecord[] = []
                yield* Effect.fork(
                    supervisor.subscribe().pipe(
                        Stream.filter(record => record.type === AgentRecordType.EVENT),
                        Stream.forEach(record =>
                            Effect.sync(() => stateChanges.push(record))
                        )
                    )
                )

                // Start the process
                yield* supervisor.send({
                    id: "start-cmd",
                    effectorId: supervisor.id,
                    timestamp: Date.now(),
                    type: AgentRecordType.COMMAND,
                    payload: {
                        type: SupervisorCommand.START_PROCESS,
                        taskAId,
                        taskBId,
                        correlationId: "test-123"
                    },
                    metadata: {}
                })

                // Verify initial state
                let state = yield* supervisor.getState()
                expect(state.processState).toBe(SupervisorProcessState.WAITING_FOR_TASK_A)
                expect(state.taskAId).toBe(taskAId)
                expect(state.taskBId).toBe(taskBId)
                expect(state.startedAt).toBeDefined()
                expect(state.completedAt).toBeUndefined()

                // Simulate Task A completion
                yield* supervisor.send({
                    id: "task-a-complete",
                    effectorId: supervisor.id,
                    timestamp: Date.now(),
                    type: AgentRecordType.EVENT,
                    payload: { type: "TASK_A_COMPLETED" },
                    metadata: { correlationId: "test-123" }
                })

                // Verify transition to Task B
                state = yield* supervisor.getState()
                expect(state.processState).toBe(SupervisorProcessState.WAITING_FOR_TASK_B)

                // Simulate Task B completion
                yield* supervisor.send({
                    id: "task-b-complete",
                    effectorId: supervisor.id,
                    timestamp: Date.now(),
                    type: AgentRecordType.EVENT,
                    payload: { type: "TASK_B_COMPLETED" },
                    metadata: { correlationId: "test-123" }
                })

                // Verify final state
                state = yield* supervisor.getState()
                expect(state.processState).toBe(SupervisorProcessState.COMPLETED)
                expect(state.completedAt).toBeDefined()
                expect(state.error).toBeUndefined()

                // Verify event sequence
                const eventTypes = stateChanges.map(
                    record => (record.payload as { type: string }).type
                )
                expect(eventTypes).toEqual([
                    SupervisorEventType.TASK_A_INITIATED,
                    SupervisorEventType.TASK_B_INITIATED,
                    SupervisorEventType.PROCESS_COMPLETED
                ])
            })

            await harness.runTest(effect)
        })

        it("should handle Task A failure", async () => {
            const effect = Effect.gen(function* (_) {
                const supervisor = yield* createSupervisorEffector("test-supervisor")
                const taskAId = makeEffectorId("task-a")
                const taskBId = makeEffectorId("task-b")

                // Start the process
                yield* supervisor.send({
                    id: "start-cmd",
                    effectorId: supervisor.id,
                    timestamp: Date.now(),
                    type: AgentRecordType.COMMAND,
                    payload: {
                        type: SupervisorCommand.START_PROCESS,
                        taskAId,
                        taskBId
                    },
                    metadata: {}
                })

                // Simulate Task A failure
                const error = new Error("Task A failed")
                yield* supervisor.send({
                    id: "task-a-fail",
                    effectorId: supervisor.id,
                    timestamp: Date.now(),
                    type: AgentRecordType.EVENT,
                    payload: {
                        type: "TASK_A_FAILED",
                        error
                    },
                    metadata: {}
                })

                // Verify failure state
                const state = yield* supervisor.getState()
                expect(state.processState).toBe(SupervisorProcessState.FAILED)
                expect(state.error).toBe(error)
                expect(state.completedAt).toBeDefined()
            })

            await harness.runTest(effect)
        })

        it("should handle process abortion", async () => {
            const effect = Effect.gen(function* (_) {
                const supervisor = yield* createSupervisorEffector("test-supervisor")
                const taskAId = makeEffectorId("task-a")
                const taskBId = makeEffectorId("task-b")

                // Start the process
                yield* supervisor.send({
                    id: "start-cmd",
                    effectorId: supervisor.id,
                    timestamp: Date.now(),
                    type: AgentRecordType.COMMAND,
                    payload: {
                        type: SupervisorCommand.START_PROCESS,
                        taskAId,
                        taskBId
                    },
                    metadata: {}
                })

                // Abort the process
                yield* supervisor.send({
                    id: "abort-cmd",
                    effectorId: supervisor.id,
                    timestamp: Date.now(),
                    type: AgentRecordType.COMMAND,
                    payload: { type: SupervisorCommand.ABORT_PROCESS },
                    metadata: {}
                })

                // Verify aborted state
                const state = yield* supervisor.getState()
                expect(state.processState).toBe(SupervisorProcessState.FAILED)
                expect(state.error).toBeDefined()
                expect((state.error as Error).message).toContain("aborted")
                expect(state.completedAt).toBeDefined()
            })

            await harness.runTest(effect)
        })
    })

    describe("error handling", () => {
        it("should handle missing task IDs", async () => {
            const effect = Effect.gen(function* (_) {
                const supervisor = yield* createSupervisorEffector("test-supervisor")

                // Start without task IDs
                yield* supervisor.send({
                    id: "start-cmd",
                    effectorId: supervisor.id,
                    timestamp: Date.now(),
                    type: AgentRecordType.COMMAND,
                    payload: {
                        type: SupervisorCommand.START_PROCESS
                        // Intentionally missing taskAId and taskBId
                    },
                    metadata: {}
                })

                // State should remain IDLE
                const state = yield* supervisor.getState()
                expect(state.processState).toBe(SupervisorProcessState.IDLE)
            })

            await harness.runTest(effect)
        })

        it("should ignore irrelevant message types", async () => {
            const effect = Effect.gen(function* (_) {
                const supervisor = yield* createSupervisorEffector("test-supervisor")
                const initialState = yield* supervisor.getState()

                // Send irrelevant message
                yield* supervisor.send({
                    id: "test",
                    effectorId: supervisor.id,
                    timestamp: Date.now(),
                    type: AgentRecordType.EVENT,
                    payload: { type: "UNKNOWN_EVENT" },
                    metadata: {}
                })

                // State should be unchanged
                const state = yield* supervisor.getState()
                expect(state).toEqual(initialState)
            })

            await harness.runTest(effect)
        })
    })

    describe("task effector integration", () => {
        it("should orchestrate actual task effectors", async () => {
            const effect = Effect.gen(function* (_) {
                // Create all effectors
                const supervisor = yield* createSupervisorEffector("test")
                const taskA = yield* createTaskEffector("A", false, 50)
                const taskB = yield* createTaskEffector("B", false, 50)

                // Collect all events
                const events: AgentRecord[] = []
                yield* Effect.fork(
                    supervisor.subscribe().pipe(
                        Stream.filter(record => record.type === AgentRecordType.EVENT),
                        Stream.forEach(record =>
                            Effect.sync(() => events.push(record))
                        )
                    )
                )

                // Start the process with real task effector IDs
                yield* supervisor.send({
                    id: "start-cmd",
                    effectorId: supervisor.id,
                    timestamp: Date.now(),
                    type: AgentRecordType.COMMAND,
                    payload: {
                        type: SupervisorCommand.START_PROCESS,
                        taskAId: taskA.id,
                        taskBId: taskB.id,
                        correlationId: "test-123"
                    },
                    metadata: {}
                })

                // Wait for processing (needs to accommodate both task delays)
                yield* Effect.sleep(200)

                // Verify final state
                const state = yield* supervisor.getState()
                expect(state.processState).toBe(SupervisorProcessState.COMPLETED)
                expect(state.error).toBeUndefined()
                expect(state.startedAt).toBeDefined()
                expect(state.completedAt).toBeDefined()

                // Verify task states
                const taskAState = yield* taskA.getState()
                const taskBState = yield* taskB.getState()
                expect(taskAState.completedAt).toBeDefined()
                expect(taskBState.completedAt).toBeDefined()
                expect(taskAState.error).toBeUndefined()
                expect(taskBState.error).toBeUndefined()

                // Verify event sequence
                const eventTypes = events.map(
                    record => (record.payload as { type: string }).type
                )
                expect(eventTypes).toEqual([
                    SupervisorEventType.TASK_A_INITIATED,
                    SupervisorEventType.TASK_B_INITIATED,
                    SupervisorEventType.PROCESS_COMPLETED
                ])
            })

            await harness.runTest(effect)
        })

        it("should handle task effector failures", async () => {
            const effect = Effect.gen(function* (_) {
                // Create supervisor and tasks (A will fail)
                const supervisor = yield* createSupervisorEffector("test")
                const taskA = yield* createTaskEffector("A", true, 50) // Will fail
                const taskB = yield* createTaskEffector("B", false, 50)

                // Start process
                yield* supervisor.send({
                    id: "start-cmd",
                    effectorId: supervisor.id,
                    timestamp: Date.now(),
                    type: AgentRecordType.COMMAND,
                    payload: {
                        type: SupervisorCommand.START_PROCESS,
                        taskAId: taskA.id,
                        taskBId: taskB.id,
                        correlationId: "test-123"
                    },
                    metadata: {}
                })

                // Wait for processing
                yield* Effect.sleep(100)

                // Verify states
                const supervisorState = yield* supervisor.getState()
                expect(supervisorState.processState).toBe(SupervisorProcessState.FAILED)
                expect(supervisorState.error).toBeDefined()
                expect((supervisorState.error as Error).message).toContain("Task A failed")

                const taskAState = yield* taskA.getState()
                expect(taskAState.error).toBeDefined()
                expect(taskAState.completedAt).toBeDefined()

                // Task B should not have started
                const taskBState = yield* taskB.getState()
                expect(taskBState.startedAt).toBeUndefined()
                expect(taskBState.completedAt).toBeUndefined()
            })

            await harness.runTest(effect)
        })

        it("should handle correlation IDs throughout the workflow", async () => {
            const effect = Effect.gen(function* (_) {
                const correlationId = "test-correlation-123"
                const supervisor = yield* createSupervisorEffector("test")
                const taskA = yield* createTaskEffector("A", false, 50)
                const taskB = yield* createTaskEffector("B", false, 50)

                // Collect events with correlation IDs
                const events: AgentRecord[] = []
                yield* Effect.fork(
                    supervisor.subscribe().pipe(
                        Stream.forEach(record =>
                            Effect.sync(() => events.push(record))
                        )
                    )
                )

                // Start process with correlation ID
                yield* supervisor.send({
                    id: "start-cmd",
                    effectorId: supervisor.id,
                    timestamp: Date.now(),
                    type: AgentRecordType.COMMAND,
                    payload: {
                        type: SupervisorCommand.START_PROCESS,
                        taskAId: taskA.id,
                        taskBId: taskB.id,
                        correlationId
                    },
                    metadata: {}
                })

                // Wait for processing
                yield* Effect.sleep(200)

                // Verify correlation IDs in all events
                for (const event of events) {
                    expect(event.metadata?.correlationId).toBe(correlationId)
                }
            })

            await harness.runTest(effect)
        })
    })
})