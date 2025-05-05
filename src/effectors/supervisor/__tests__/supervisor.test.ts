import {
    AgentRecord,
    AgentRecordType,
    AgentRuntimeService,
    makeAgentRuntimeId
} from "@/agent-runtime/index.js"
import { Effect, Ref, Stream, pipe } from "effect"
import { describe, expect, it } from "vitest"
import { SupervisorEventType } from "../types.js"
import { createTaskRuntime } from "./task-runtime.js"

// Helper to run Effect as Promise
const runTest = <E, A>(effect: Effect.Effect<A, E>): Promise<A> =>
    Effect.runPromise(effect)

describe("SupervisorRuntime", () => {
    it("should coordinate tasks and handle success case", () =>
        runTest(Effect.gen(function* () {
            const service = yield* AgentRuntimeService

            // Create supervisor runtime
            const supervisorId = makeAgentRuntimeId("test-supervisor")
            const runtime = yield* service.create(supervisorId, {
                taskAId: makeAgentRuntimeId("test-task-a"),
                taskBId: makeAgentRuntimeId("test-task-b")
            })

            // Create task runtimes
            const taskA = yield* createTaskRuntime("A")
            const taskB = yield* createTaskRuntime("B")

            // Create a ref to store received events
            const events = yield* Ref.make<AgentRecord[]>([])

            // Subscribe to supervisor events
            yield* pipe(
                runtime.subscribe(),
                Stream.tap(record => {
                    if (record.type === AgentRecordType.EVENT) {
                        return Ref.update(events, list => [...list, record])
                    }
                    return Effect.unit
                }),
                Stream.take(5), // TASK_A_INITIATED, TASK_A_COMPLETED, TASK_B_INITIATED, TASK_B_COMPLETED, PROCESS_COMPLETED
                Stream.runDrain,
                Effect.fork
            )

            // Start the process
            yield* service.send(supervisorId, {
                id: "test-command",
                agentRuntimeId: supervisorId,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: { type: "START_PROCESS" },
                metadata: {}
            })

            // Wait for events to be processed
            yield* Effect.sleep(500)

            // Check received events
            const receivedEvents = yield* Ref.get(events)
            const eventTypes = receivedEvents.map(e => (e.payload as any).type)

            expect(eventTypes).toEqual([
                SupervisorEventType.TASK_A_INITIATED,
                SupervisorEventType.TASK_A_COMPLETED,
                SupervisorEventType.TASK_B_INITIATED,
                SupervisorEventType.TASK_B_COMPLETED,
                SupervisorEventType.PROCESS_COMPLETED
            ])
        }).pipe(
            Effect.provide(AgentRuntimeService.Default)
        ))
    )

    it("should handle task A failure", () =>
        runTest(Effect.gen(function* () {
            const service = yield* AgentRuntimeService

            // Create supervisor runtime
            const supervisorId = makeAgentRuntimeId("test-supervisor")
            const runtime = yield* service.create(supervisorId, {
                taskAId: makeAgentRuntimeId("test-task-a"),
                taskBId: makeAgentRuntimeId("test-task-b")
            })

            // Create task runtimes (A will fail)
            const taskA = yield* createTaskRuntime("A", true)
            const taskB = yield* createTaskRuntime("B")

            // Create a ref to store received events
            const events = yield* Ref.make<AgentRecord[]>([])

            // Subscribe to supervisor events
            yield* pipe(
                runtime.subscribe(),
                Stream.tap(record => {
                    if (record.type === AgentRecordType.EVENT) {
                        return Ref.update(events, list => [...list, record])
                    }
                    return Effect.unit
                }),
                Stream.take(3), // TASK_A_INITIATED, TASK_A_FAILED, PROCESS_FAILED
                Stream.runDrain,
                Effect.fork
            )

            // Start the process
            yield* service.send(supervisorId, {
                id: "test-command",
                agentRuntimeId: supervisorId,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: { type: "START_PROCESS" },
                metadata: {}
            })

            // Wait for events to be processed
            yield* Effect.sleep(500)

            // Check received events
            const receivedEvents = yield* Ref.get(events)
            const eventTypes = receivedEvents.map(e => (e.payload as any).type)

            expect(eventTypes).toEqual([
                SupervisorEventType.TASK_A_INITIATED,
                SupervisorEventType.TASK_A_FAILED,
                SupervisorEventType.PROCESS_FAILED
            ])
        }).pipe(
            Effect.provide(AgentRuntimeService.Default)
        ))
    )

    it("should handle task B failure", () =>
        runTest(Effect.gen(function* () {
            const service = yield* AgentRuntimeService

            // Create supervisor runtime
            const supervisorId = makeAgentRuntimeId("test-supervisor")
            const runtime = yield* service.create(supervisorId, {
                taskAId: makeAgentRuntimeId("test-task-a"),
                taskBId: makeAgentRuntimeId("test-task-b")
            })

            // Create task runtimes (B will fail)
            const taskA = yield* createTaskRuntime("A", false)
            const taskB = yield* createTaskRuntime("B", true)

            // Create a ref to store received events
            const events = yield* Ref.make<AgentRecord[]>([])

            // Subscribe to supervisor events
            yield* pipe(
                runtime.subscribe(),
                Stream.tap(record => {
                    if (record.type === AgentRecordType.EVENT) {
                        return Ref.update(events, list => [...list, record])
                    }
                    return Effect.unit
                }),
                Stream.take(4), // TASK_A_INITIATED, TASK_A_COMPLETED, TASK_B_INITIATED, PROCESS_FAILED
                Stream.runDrain,
                Effect.fork
            )

            // Start the process
            yield* service.send(supervisorId, {
                id: "test-command",
                agentRuntimeId: supervisorId,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: { type: "START_PROCESS" },
                metadata: {}
            })

            // Wait for events to be processed
            yield* Effect.sleep(500)

            // Check received events
            const receivedEvents = yield* Ref.get(events)
            const eventTypes = receivedEvents.map(e => (e.payload as any).type)

            expect(eventTypes).toEqual([
                SupervisorEventType.TASK_A_INITIATED,
                SupervisorEventType.TASK_A_COMPLETED,
                SupervisorEventType.TASK_B_INITIATED,
                SupervisorEventType.TASK_B_FAILED,
                SupervisorEventType.PROCESS_FAILED
            ])
        }).pipe(
            Effect.provide(AgentRuntimeService.Default)
        ))
    )
})