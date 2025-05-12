import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { InvalidAmountError, NegativeValueError } from "../errors.js"
import { CounterService } from "../service.js"

describe("CounterService", () => {
    describe("increment", () => {
        it("should increment by 1 by default", async () => {
            const program = Effect.gen(function* () {
                const counter = yield* CounterService
                yield* counter.increment()
                const value = yield* counter.get()
                expect(value).toBe(1)
            })

            await Effect.runPromise(program.pipe(Effect.provide(CounterService)))
        })

        it("should increment by specified amount", async () => {
            const program = Effect.gen(function* () {
                const counter = yield* CounterService
                yield* counter.increment(5)
                const value = yield* counter.get()
                expect(value).toBe(5)
            })

            await Effect.runPromise(program.pipe(Effect.provide(CounterService)))
        })

        it("should fail with InvalidAmountError for negative amount", async () => {
            const program = Effect.gen(function* () {
                const counter = yield* CounterService
                const result = yield* Effect.either(counter.increment(-1))

                expect(result._tag).toBe("Left")
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(InvalidAmountError)
                    expect(result.left.invalidAmount).toBe(-1)
                }
            })

            await Effect.runPromise(program.pipe(Effect.provide(CounterService)))
        })
    })

    describe("decrement", () => {
        it("should decrement by 1 by default", async () => {
            const program = Effect.gen(function* () {
                const counter = yield* CounterService
                yield* counter.increment(5)
                yield* counter.decrement()
                const value = yield* counter.get()
                expect(value).toBe(4)
            })

            await Effect.runPromise(program.pipe(Effect.provide(CounterService)))
        })

        it("should fail when decrementing below zero", async () => {
            const program = Effect.gen(function* () {
                const counter = yield* CounterService
                yield* counter.increment(5)
                const result = yield* Effect.either(counter.decrement(6))

                expect(result._tag).toBe("Left")
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(NegativeValueError)
                    expect(result.left.currentValue).toBe(5)
                    expect(result.left.decrementAmount).toBe(6)
                }
            })

            await Effect.runPromise(program.pipe(Effect.provide(CounterService)))
        })
    })

    describe("reset", () => {
        it("should reset to 0 by default", async () => {
            const program = Effect.gen(function* () {
                const counter = yield* CounterService
                yield* counter.increment(5)
                yield* counter.reset()
                const value = yield* counter.get()
                expect(value).toBe(0)
            })

            await Effect.runPromise(program.pipe(Effect.provide(CounterService)))
        })

        it("should reset to specified value", async () => {
            const program = Effect.gen(function* () {
                const counter = yield* CounterService
                yield* counter.reset(10)
                const value = yield* counter.get()
                expect(value).toBe(10)
            })

            await Effect.runPromise(program.pipe(Effect.provide(CounterService)))
        })

        it("should fail with InvalidAmountError for negative reset value", async () => {
            const program = Effect.gen(function* () {
                const counter = yield* CounterService
                const result = yield* Effect.either(counter.reset(-1))

                expect(result._tag).toBe("Left")
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(InvalidAmountError)
                    expect(result.left.invalidAmount).toBe(-1)
                }
            })

            await Effect.runPromise(program.pipe(Effect.provide(CounterService)))
        })
    })
}) 