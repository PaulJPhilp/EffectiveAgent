import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { makeEffectorId } from "../../effector/types.js"
import { createSupervisorEffector } from "../supervisor/supervisor-effector.js"
import { SupervisorCommand, SupervisorProcessState } from "../supervisor/types.js"

describe("SupervisorEffector", () => {
    it("should coordinate tasks successfully", () =>
        Effect.gen(function* (_) {
            // Create supervisor
            const effector = yield* _(createSupervisorEffector(makeEffectorId("test"), {
                taskADelay: 100,
                taskBDelay: 100
            }))

            // Start the process
            yield* _(effector.send({
                id: "test-1",
                effectorId: effector.id,
                timestamp: Date.now(),
                type: "COMMAND",
                payload: SupervisorCommand.START,
                metadata: {}
            }))

            // Wait for completion
            yield* _(Effect.sleep(300))

            // Check final state
            const state = yield* _(effector.getState())
            expect(state.state.processState).toBe(SupervisorProcessState.COMPLETED)
            expect(state.state.taskAId).toBeDefined()
            expect(state.state.taskBId).toBeDefined()
        }).pipe(Effect.timeout("2 seconds")))

    it("should handle task failure", () =>
        Effect.gen(function* (_) {
            // Create supervisor with failing task
            const effector = yield* _(createSupervisorEffector(makeEffectorId("test"), {
                taskADelay: 100,
                taskBDelay: 100,
                failTaskB: true
            }))

            // Start the process
            yield* _(effector.send({
                id: "test-1",
                effectorId: effector.id,
                timestamp: Date.now(),
                type: "COMMAND",
                payload: SupervisorCommand.START,
                metadata: {}
            }))

            // Wait for failure
            yield* _(Effect.sleep(300))

            // Check final state
            const state = yield* _(effector.getState())
            expect(state.state.processState).toBe(SupervisorProcessState.FAILED)
            expect(state.state.error).toBeDefined()
        }).pipe(Effect.timeout("2 seconds")))

    it("should handle cancellation", () =>
        Effect.gen(function* (_) {
            // Create supervisor with longer delays
            const effector = yield* _(createSupervisorEffector(makeEffectorId("test"), {
                taskADelay: 200,
                taskBDelay: 200
            }))

            // Start the process
            yield* _(effector.send({
                id: "test-1",
                effectorId: effector.id,
                timestamp: Date.now(),
                type: "COMMAND",
                payload: SupervisorCommand.START,
                metadata: {}
            }))

            // Wait briefly then cancel
            yield* _(Effect.sleep(100))
            yield* _(effector.send({
                id: "test-2",
                effectorId: effector.id,
                timestamp: Date.now(),
                type: "COMMAND",
                payload: SupervisorCommand.CANCEL,
                metadata: {}
            }))

            // Check final state
            const state = yield* _(effector.getState())
            expect(state.state.processState).toBe(SupervisorProcessState.CANCELLED)
        }).pipe(Effect.timeout("2 seconds")))
}) 