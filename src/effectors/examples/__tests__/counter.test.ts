import { createServiceTestHarness } from "@/services/core/test-utils/effect-test-harness.js"
import { Effect, Stream, pipe } from "effect"
import { describe, expect, it } from "vitest"
import { EffectorService } from "../../effector/service.js"
import { AgentRecordType, makeEffectorId } from "../../effector/types.js"
import { CounterCommand, createCounterEffector } from "../counter.js"

const harness = createServiceTestHarness(EffectorService)

describe("CounterEffector", () => {
    it("should create a counter with initial state", async () => {
        const effect = Effect.gen(function* () {
            const id = makeEffectorId("test-counter")
            const counter = yield* createCounterEffector(id, 5)
            const state = yield* counter.getState()

            expect(state.state.count).toBe(5)
        })

        await harness.runTest(effect)
    })

    it("should increment counter", async () => {
        const effect = Effect.gen(function* () {
            const id = makeEffectorId("test-counter")
            const counter = yield* createCounterEffector(id)

            // Send increment command
            yield* counter.send({
                id: "test-cmd",
                effectorId: id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: { type: CounterCommand.INCREMENT },
                metadata: {}
            })

            // Wait for state change event
            const events: unknown[] = []
            yield* pipe(
                counter.subscribe(),
                Stream.take(1),
                Stream.runForEach(record => Effect.sync(() => events.push(record)))
            )

            // Verify state
            const state = yield* counter.getState()
            expect(state.state.count).toBe(1)
            expect(state.state.lastOperation).toBe(CounterCommand.INCREMENT)

            // Verify event
            expect(events).toHaveLength(1)
            expect((events[0] as any).type).toBe(AgentRecordType.STATE_CHANGE)
            expect((events[0] as any).payload.count).toBe(1)
        })

        await harness.runTest(effect)
    })

    it("should decrement counter", async () => {
        const effect = Effect.gen(function* () {
            const id = makeEffectorId("test-counter")
            const counter = yield* createCounterEffector(id, 5)

            // Send decrement command
            yield* counter.send({
                id: "test-cmd",
                effectorId: id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: { type: CounterCommand.DECREMENT },
                metadata: {}
            })

            // Wait for state change event
            const events: unknown[] = []
            yield* pipe(
                counter.subscribe(),
                Stream.take(1),
                Stream.runForEach(record => Effect.sync(() => events.push(record)))
            )

            // Verify state
            const state = yield* counter.getState()
            expect(state.state.count).toBe(4)
            expect(state.state.lastOperation).toBe(CounterCommand.DECREMENT)

            // Verify event
            expect(events).toHaveLength(1)
            expect((events[0] as any).type).toBe(AgentRecordType.STATE_CHANGE)
            expect((events[0] as any).payload.count).toBe(4)
        })

        await harness.runTest(effect)
    })

    it("should reset counter", async () => {
        const effect = Effect.gen(function* () {
            const id = makeEffectorId("test-counter")
            const counter = yield* createCounterEffector(id, 5)

            // Send reset command
            yield* counter.send({
                id: "test-cmd",
                effectorId: id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: { type: CounterCommand.RESET },
                metadata: {}
            })

            // Wait for state change event
            const events: unknown[] = []
            yield* pipe(
                counter.subscribe(),
                Stream.take(1),
                Stream.runForEach(record => Effect.sync(() => events.push(record)))
            )

            // Verify state
            const state = yield* counter.getState()
            expect(state.state.count).toBe(0)
            expect(state.state.lastOperation).toBe(CounterCommand.RESET)

            // Verify event
            expect(events).toHaveLength(1)
            expect((events[0] as any).type).toBe(AgentRecordType.STATE_CHANGE)
            expect((events[0] as any).payload.count).toBe(0)
        })

        await harness.runTest(effect)
    })
}) 