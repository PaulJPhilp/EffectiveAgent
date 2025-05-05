import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { AgentRecordType, makeEffectorId } from "../../effector/types.js"
import { createAsyncEffector } from "../async/async-effector.js"
import { AsyncOperationCommand, AsyncOperationStatus } from "../async/types.js"

describe("AsyncOperationEffector", () => {
    it("should handle successful async operation", () =>
        Effect.gen(function* () {
            // Create effector with high success rate
            const effector = yield* createAsyncEffector(makeEffectorId("test"), 100, 1.0)

            // Start operation
            yield* effector.send({
                id: "test-1",
                effectorId: effector.id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: AsyncOperationCommand.START_FETCH,
                metadata: {}
            })

            // Wait for completion
            yield* Effect.sleep(200)

            // Check final state
            const state = yield* effector.getState()
            expect(state.state.status).toBe(AsyncOperationStatus.SUCCESS)
        }).pipe(Effect.timeout("2 seconds")))

    it("should handle failed async operation", () =>
        Effect.gen(function* () {
            // Create effector with zero success rate
            const effector = yield* createAsyncEffector(makeEffectorId("test"), 100, 0.0)

            // Start operation
            yield* effector.send({
                id: "test-1",
                effectorId: effector.id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: AsyncOperationCommand.START_FETCH,
                metadata: {}
            })

            // Wait for completion
            yield* Effect.sleep(200)

            // Check final state
            const state = yield* effector.getState()
            expect(state.state.status).toBe(AsyncOperationStatus.FAILURE)
        }).pipe(Effect.timeout("2 seconds")))

    it("should handle cancellation", () =>
        Effect.gen(function* () {
            // Create effector with long delay
            const effector = yield* createAsyncEffector(makeEffectorId("test"), 1000, 1.0)

            // Start operation
            yield* effector.send({
                id: "test-1",
                effectorId: effector.id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: AsyncOperationCommand.START_FETCH,
                metadata: {}
            })

            // Wait briefly then cancel
            yield* Effect.sleep(100)
            yield* effector.send({
                id: "test-2",
                effectorId: effector.id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: AsyncOperationCommand.CANCEL_FETCH,
                metadata: {}
            })

            // Check final state
            const state = yield* effector.getState()
            expect(state.state.status).toBe(AsyncOperationStatus.IDLE)
        }).pipe(Effect.timeout("2 seconds")))
}) 