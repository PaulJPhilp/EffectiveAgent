import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { makeEffectorId } from "../../effector/types.js"
import { createCounterEffector } from "../counter/counter.js"
import { CounterCommand } from "../counter/types.js"

describe("CounterEffector", () => {
    it("should increment counter", () =>
        Effect.gen(function* (_) {
            // Create counter
            const effector = yield* _(createCounterEffector(makeEffectorId("test")))

            // Increment counter
            yield* _(effector.send({
                id: "test-1",
                effectorId: effector.id,
                timestamp: Date.now(),
                type: "COMMAND",
                payload: {
                    type: CounterCommand.INCREMENT,
                    amount: 1
                },
                metadata: {}
            }))

            // Check state
            const state = yield* _(effector.getState())
            expect(state.state.value).toBe(1)
        }).pipe(Effect.timeout("2 seconds")))

    it("should decrement counter", () =>
        Effect.gen(function* (_) {
            // Create counter
            const effector = yield* _(createCounterEffector(makeEffectorId("test")))

            // Increment then decrement
            yield* _(effector.send({
                id: "test-1",
                effectorId: effector.id,
                timestamp: Date.now(),
                type: "COMMAND",
                payload: {
                    type: CounterCommand.INCREMENT,
                    amount: 5
                },
                metadata: {}
            }))

            yield* _(effector.send({
                id: "test-2",
                effectorId: effector.id,
                timestamp: Date.now(),
                type: "COMMAND",
                payload: {
                    type: CounterCommand.DECREMENT,
                    amount: 3
                },
                metadata: {}
            }))

            // Check state
            const state = yield* _(effector.getState())
            expect(state.state.value).toBe(2)
        }).pipe(Effect.timeout("2 seconds")))

    it("should reset counter", () =>
        Effect.gen(function* (_) {
            // Create counter
            const effector = yield* _(createCounterEffector(makeEffectorId("test")))

            // Increment then reset
            yield* _(effector.send({
                id: "test-1",
                effectorId: effector.id,
                timestamp: Date.now(),
                type: "COMMAND",
                payload: {
                    type: CounterCommand.INCREMENT,
                    amount: 5
                },
                metadata: {}
            }))

            yield* _(effector.send({
                id: "test-2",
                effectorId: effector.id,
                timestamp: Date.now(),
                type: "COMMAND",
                payload: {
                    type: CounterCommand.RESET
                },
                metadata: {}
            }))

            // Check state
            const state = yield* _(effector.getState())
            expect(state.state.value).toBe(0)
        }).pipe(Effect.timeout("2 seconds")))
}) 