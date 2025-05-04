import { Effect, pipe } from "effect"
import { describe, expect, it } from "vitest"
import { ControllerCommand, ControllerStatus, type ControllerState } from "../types.js"
import { createControllerEffector } from "../controller-effector.js"
import { EffectorService } from "../../effector/service.js"
import type { Effector } from "../../effector/api.js"
import { createControllerRecord } from "../test-helpers.js"

describe("ControllerEffector", () => {
    const testId = "test-controller"

    const createTestController = () => pipe(
        createControllerEffector(testId),
        Effect.provide(EffectorService.Default)
    )

    it("should start with initial state", () => 
        Effect.gen(function* (_) {
            const controller = yield* createTestController()
            const effectorState = yield* controller.getState()
            const state = effectorState.state
            expect(state.status).toBe(ControllerStatus.IDLE)
            expect(state.totalPausedTime).toBe(0)
            expect(state.history).toHaveLength(0)
        })
    )

    it("should start process", () => 
        Effect.gen(function* (_) {
            const controller = yield* createTestController()
            yield* controller.send(createControllerRecord(testId, new ControllerCommand.Start()))
            const effectorState = yield* controller.getState()
            const state = effectorState.state
            expect(state.status).toBe(ControllerStatus.RUNNING)
            expect(state.startTime).toBeDefined()
            expect(state.history).toHaveLength(1)
            expect(state.history[0].command).toBeInstanceOf(ControllerCommand.Start)
            expect(state.history[0].previousStatus).toBe(ControllerStatus.IDLE)
            expect(state.history[0].newStatus).toBe(ControllerStatus.RUNNING)
        })
    )

    it("should pause process", () => 
        Effect.gen(function* (_) {
            const controller = yield* createTestController()
            yield* controller.send(createControllerRecord(testId, new ControllerCommand.Start()))
            yield* controller.send(createControllerRecord(testId, new ControllerCommand.Pause()))
            const effectorState = yield* controller.getState()
            const state = effectorState.state
            expect(state.status).toBe(ControllerStatus.PAUSED)
            expect(state.pausedAt).toBeDefined()
            expect(state.history).toHaveLength(2)
            expect(state.history[1].command).toBeInstanceOf(ControllerCommand.Pause)
            expect(state.history[1].previousStatus).toBe(ControllerStatus.RUNNING)
            expect(state.history[1].newStatus).toBe(ControllerStatus.PAUSED)
        })
    )

    it("should resume process", () => 
        Effect.gen(function* (_) {
            const controller = yield* createTestController()
            yield* controller.send(createControllerRecord(testId, new ControllerCommand.Start()))
            yield* controller.send(createControllerRecord(testId, new ControllerCommand.Pause()))
            yield* controller.send(createControllerRecord(testId, new ControllerCommand.Resume()))
            const effectorState = yield* controller.getState()
            const state = effectorState.state
            expect(state.status).toBe(ControllerStatus.RUNNING)
            expect(state.pausedAt).toBeUndefined()
            expect(state.totalPausedTime).toBeGreaterThan(0)
            expect(state.history).toHaveLength(3)
            expect(state.history[2].command).toBeInstanceOf(ControllerCommand.Resume)
            expect(state.history[2].previousStatus).toBe(ControllerStatus.PAUSED)
            expect(state.history[2].newStatus).toBe(ControllerStatus.RUNNING)
        })
    )

    it("should stop process", () => 
        Effect.gen(function* (_) {
            const controller = yield* createTestController()
            yield* controller.send(createControllerRecord(testId, new ControllerCommand.Start()))
            yield* controller.send(createControllerRecord(testId, new ControllerCommand.Stop()))
            const effectorState = yield* controller.getState()
            const state = effectorState.state
            expect(state.status).toBe(ControllerStatus.STOPPED)
            expect(state.startTime).toBeUndefined()
            expect(state.pausedAt).toBeUndefined()
            expect(state.history).toHaveLength(2)
            expect(state.history[1].command).toBeInstanceOf(ControllerCommand.Stop)
            expect(state.history[1].previousStatus).toBe(ControllerStatus.RUNNING)
            expect(state.history[1].newStatus).toBe(ControllerStatus.STOPPED)
        })
    )

    it("should reset process", () => 
        Effect.gen(function* (_) {
            const controller = yield* createTestController()
            yield* controller.send(createControllerRecord(testId, new ControllerCommand.Start()))
            yield* controller.send(createControllerRecord(testId, new ControllerCommand.Pause()))
            yield* controller.send(createControllerRecord(testId, new ControllerCommand.Resume()))
            yield* controller.send(createControllerRecord(testId, new ControllerCommand.Stop()))
            yield* controller.send(createControllerRecord(testId, new ControllerCommand.Reset()))
            const effectorState = yield* controller.getState()
            const state = effectorState.state
            expect(state.status).toBe(ControllerStatus.IDLE)
            expect(state.startTime).toBeUndefined()
            expect(state.pausedAt).toBeUndefined()
            expect(state.totalPausedTime).toBe(0)
            expect(state.history).toHaveLength(5)
            expect(state.history[4].command).toBeInstanceOf(ControllerCommand.Reset)
            expect(state.history[4].previousStatus).toBe(ControllerStatus.STOPPED)
            expect(state.history[4].newStatus).toBe(ControllerStatus.IDLE)
        })
    )

    it("should maintain history of all operations", () => 
        Effect.gen(function* (_) {
            const controller = yield* createTestController()
            yield* controller.send(createControllerRecord(testId, new ControllerCommand.Start()))
            yield* controller.send(createControllerRecord(testId, new ControllerCommand.Pause()))
            yield* controller.send(createControllerRecord(testId, new ControllerCommand.Resume()))
            yield* controller.send(createControllerRecord(testId, new ControllerCommand.Stop()))
            yield* controller.send(createControllerRecord(testId, new ControllerCommand.Reset()))

            const effectorState = yield* controller.getState()
            const state = effectorState.state
            expect(state.history).toHaveLength(5)
            expect(state.history.map(h => h.command._tag)).toEqual([
                "Start",
                "Pause",
                "Resume",
                "Stop",
                "Reset"
            ])
            expect(state.history.map(h => h.newStatus)).toEqual([
                ControllerStatus.RUNNING,
                ControllerStatus.PAUSED,
                ControllerStatus.RUNNING,
                ControllerStatus.STOPPED,
                ControllerStatus.IDLE
            ])
        })
    )
})
