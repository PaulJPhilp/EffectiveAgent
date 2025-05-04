import { Effect, Layer, pipe } from "effect"
import { beforeEach, describe, expect, it } from "vitest"
import { CounterCommand, type CounterState } from "../types.js"
import { createCounterEffector } from "../counter-effector.js"
import { EffectorService } from "../../effector/service.js"
import type { Effector } from "../../effector/api.js"
import { createCounterRecord } from "../test-helpers.js"

describe("CounterEffector", () => {
    const testId = "test-counter"

    const createTestCounter = () => pipe(
        createCounterEffector(testId),
        Effect.provide(EffectorService.Default)
    )

    it("should start with initial state", () => 
        Effect.gen(function* (_) {
            const counter = yield* createTestCounter()
            const effectorState = yield* counter.getState()
            const state = effectorState.state
            expect(state.value).toBe(0)
            expect(state.history).toHaveLength(0)
        })
    )

    it("should increment counter", () => 
        Effect.gen(function* (_) {
            const counter = yield* createTestCounter()
            yield* counter.send(createCounterRecord(testId, new CounterCommand.Increment()))
            const effectorState = yield* counter.getState()
            const state = effectorState.state
            expect(state.value).toBe(1)
            expect(state.history).toHaveLength(1)
            expect(state.history[0].command).toBeInstanceOf(CounterCommand.Increment)
        })
    )

    it("should decrement counter", () => 
        Effect.gen(function* (_) {
            const counter = yield* createTestCounter()
            yield* counter.send(createCounterRecord(testId, new CounterCommand.Decrement()))
            const effectorState = yield* counter.getState()
            const state = effectorState.state
            expect(state.value).toBe(-1)
            expect(state.history).toHaveLength(1)
            expect(state.history[0].command).toBeInstanceOf(CounterCommand.Decrement)
        })
    )

    it("should reset counter", () => 
        Effect.gen(function* (_) {
            const counter = yield* createTestCounter()
            yield* counter.send(createCounterRecord(testId, new CounterCommand.Add({ amount: 10 })))
            yield* counter.send(createCounterRecord(testId, new CounterCommand.Reset()))
            const effectorState = yield* counter.getState()
            const state = effectorState.state
            expect(state.value).toBe(0)
            expect(state.history).toHaveLength(2)
            expect(state.history[1].command).toBeInstanceOf(CounterCommand.Reset)
        })
    )

    it("should add amount to counter", () => 
        Effect.gen(function* (_) {
            const counter = yield* createTestCounter()
            yield* counter.send(createCounterRecord(testId, new CounterCommand.Add({ amount: 5 })))
            const effectorState = yield* counter.getState()
            const state = effectorState.state
            expect(state.value).toBe(5)
            expect(state.history).toHaveLength(1)
            expect(state.history[0].command).toBeInstanceOf(CounterCommand.Add)
        })
    )

    it("should maintain history of all operations", () => 
        Effect.gen(function* (_) {
            const counter = yield* createTestCounter()
            yield* counter.send(createCounterRecord(testId, new CounterCommand.Increment()))
            yield* counter.send(createCounterRecord(testId, new CounterCommand.Add({ amount: 2 })))
            yield* counter.send(createCounterRecord(testId, new CounterCommand.Decrement()))
            yield* counter.send(createCounterRecord(testId, new CounterCommand.Reset()))

            const effectorState = yield* counter.getState()
            const state = effectorState.state
            expect(state.history).toHaveLength(4)
            expect(state.history.map(h => h.command._tag)).toEqual([
                "Increment",
                "Add",
                "Decrement",
                "Reset"
            ])
            expect(state.history.map(h => h.newValue)).toEqual([1, 3, 2, 0])
        })
    )
})
