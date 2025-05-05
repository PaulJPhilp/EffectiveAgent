import { Effect, Stream, pipe } from "effect"
import { describe, expect, it } from "vitest"
import { EffectorService } from "../../../effector/service.js"
import { AgentRecordType, makeEffectorId } from "../../../effector/types.js"
import { createSupervisorEffector } from "../supervisor.js"
import { SupervisorCommand, SupervisorEventType, SupervisorProcessState } from "../types.js"

describe("SupervisorEffector", () => {
    it("should create supervisor with initial IDLE state", () =>
        Effect.gen(function* () {
            const id = makeEffectorId("test-supervisor")
            const supervisor = yield* createSupervisorEffector(id)
            const state = yield* supervisor.getState()

            expect(state.state.processState).toBe(SupervisorProcessState.IDLE)
            expect(state.state.taskAId).toBeUndefined()
            expect(state.state.taskBId).toBeUndefined()
            expect(state.state.error).toBeUndefined()
        }).pipe(Effect.provide(EffectorService.Default)))

    it("should successfully coordinate TaskA and TaskB", () =>
        Effect.gen(function* () {
            const id = makeEffectorId("test-supervisor")
            const supervisor = yield* createSupervisorEffector(id)

            // Collect all events for verification
            const events: unknown[] = []
            yield* pipe(
                supervisor.subscribe(),
                Stream.filter(record => record.type === AgentRecordType.EVENT),
                Stream.forEach(event => Effect.sync(() => events.push(event))),
                Effect.fork
            )

            // Start the process
            yield* supervisor.send({
                id: crypto.randomUUID(),
                effectorId: id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: { type: SupervisorCommand.START_PROCESS },
                metadata: {}
            })

            // Wait for completion (both tasks + supervision)
            yield* Effect.sleep(5000)

            // Verify final state
            const finalState = yield* supervisor.getState()
            expect(finalState.state.processState).toBe(SupervisorProcessState.COMPLETED)
            expect(finalState.state.startedAt).toBeDefined()
            expect(finalState.state.completedAt).toBeDefined()
            expect(finalState.state.error).toBeUndefined()

            // Verify event sequence
            expect(events.length).toBeGreaterThanOrEqual(3) // At minimum: PROCESS_STARTED, TASK_A events, TASK_B events
            const eventTypes = events.map((e: any) => e.payload.type)
            expect(eventTypes).toContain(SupervisorEventType.PROCESS_STARTED)
            expect(eventTypes).toContain(SupervisorEventType.PROCESS_COMPLETED)
        }).pipe(Effect.provide(EffectorService.Default)))

    it("should handle task failure and abort process", () =>
        Effect.gen(function* () {
            const id = makeEffectorId("test-supervisor")
            const supervisor = yield* createSupervisorEffector(id)

            // Start the process
            yield* supervisor.send({
                id: crypto.randomUUID(),
                effectorId: id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: { type: SupervisorCommand.START_PROCESS },
                metadata: {}
            })

            // Let it start
            yield* Effect.sleep(100)

            // Abort the process
            yield* supervisor.send({
                id: crypto.randomUUID(),
                effectorId: id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: { type: SupervisorCommand.ABORT_PROCESS },
                metadata: {}
            })

            // Wait for termination
            yield* Effect.sleep(100)

            // Verify final state
            const finalState = yield* supervisor.getState()
            expect(finalState.state.processState).toBe(SupervisorProcessState.FAILED)
            expect(finalState.state.error).toBeDefined()
            expect(finalState.state.completedAt).toBeDefined()
        }).pipe(Effect.provide(EffectorService.Default)))
})