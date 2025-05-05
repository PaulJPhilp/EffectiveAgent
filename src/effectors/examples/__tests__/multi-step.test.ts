import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { makeEffectorId } from "../../effector/types.js"
import { createMultiStepEffector } from "../multi-step/multi-step-effector.js"
import { MultiStepCommand } from "../multi-step/types.js"

describe("MultiStepEffector", () => {
    it("should complete all steps successfully", () =>
        Effect.gen(function* (_) {
            // Create effector with 3 steps
            const effector = yield* _(createMultiStepEffector(makeEffectorId("test"), {
                totalSteps: 3,
                stepDelayMs: 100
            }))

            // Start the task
            yield* _(effector.send({
                id: "test-1",
                effectorId: effector.id,
                timestamp: Date.now(),
                type: "COMMAND",
                payload: MultiStepCommand.START_TASK,
                metadata: {}
            }))

            // Wait for completion
            yield* _(Effect.sleep(400))

            // Check final state
            const state = yield* _(effector.getState())
            expect(state.state.currentStep).toBe(3)
            expect(Object.values(state.state.steps).every(s => s.status === "completed")).toBe(true)
        }).pipe(Effect.timeout("2 seconds")))

    it("should handle step failure", () =>
        Effect.gen(function* (_) {
            // Create effector with failing step
            const effector = yield* _(createMultiStepEffector(makeEffectorId("test"), {
                totalSteps: 3,
                stepDelayMs: 100,
                failureProbability: 1.0 // Force failure
            }))

            // Start the task
            yield* _(effector.send({
                id: "test-1",
                effectorId: effector.id,
                timestamp: Date.now(),
                type: "COMMAND",
                payload: MultiStepCommand.START_TASK,
                metadata: {}
            }))

            // Wait for failure
            yield* _(Effect.sleep(300))

            // Check final state
            const state = yield* _(effector.getState())
            expect(state.state.currentStep).toBe(2)
            expect(state.state.steps[2].status).toBe("failed")
        }).pipe(Effect.timeout("2 seconds")))

    it("should pause and resume execution", () =>
        Effect.gen(function* (_) {
            // Create effector
            const effector = yield* _(createMultiStepEffector(makeEffectorId("test"), {
                totalSteps: 3,
                stepDelayMs: 100
            }))

            // Start the task
            yield* _(effector.send({
                id: "test-1",
                effectorId: effector.id,
                timestamp: Date.now(),
                type: "COMMAND",
                payload: MultiStepCommand.START_TASK,
                metadata: {}
            }))

            // Wait for first step then pause
            yield* _(Effect.sleep(150))
            yield* _(effector.send({
                id: "test-2",
                effectorId: effector.id,
                timestamp: Date.now(),
                type: "COMMAND",
                payload: MultiStepCommand.PAUSE_TASK,
                metadata: {}
            }))

            // Check paused state
            let state = yield* _(effector.getState())
            expect(state.state.currentStep).toBe(1)

            // Resume and wait for completion
            yield* _(effector.send({
                id: "test-3",
                effectorId: effector.id,
                timestamp: Date.now(),
                type: "COMMAND",
                payload: MultiStepCommand.RESUME_TASK,
                metadata: {}
            }))
            yield* _(Effect.sleep(300))

            // Check final state
            state = yield* _(effector.getState())
            expect(state.state.currentStep).toBe(3)
            expect(Object.values(state.state.steps).every(s => s.status === "completed")).toBe(true)
        }).pipe(Effect.timeout("2 seconds")))
}) 