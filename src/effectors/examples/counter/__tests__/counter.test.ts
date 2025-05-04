import { Effect, Stream, pipe } from "effect"
import { describe, expect, it } from "vitest"
import { EffectorService } from "../../../effector/service.js"
import { AgentRecordType, makeEffectorId } from "../../../effector/types.js"
import { CounterCommand, createCounterEffector } from "../counter.js"

describe("CounterEffector", () => {
    it("should handle direct state changes", async () => {
        const program = Effect.gen(function* () {
            // Create a counter effector
            const counterId = makeEffectorId("test-counter")
            const counter = yield* createCounterEffector(counterId, 0)

            // Set up state change listener
            const stateChanges: unknown[] = []
            const fiber = yield* pipe(
                counter.subscribe(),
                Stream.filter(record => record.type === AgentRecordType.STATE_CHANGE),
                Stream.tap(record => Effect.sync(() => stateChanges.push(record))),
                Stream.runDrain,
                Effect.fork
            )

            // Wait for subscription to be ready
            yield* Effect.sleep(100)

            // Send state change directly
            yield* counter.send({
                id: crypto.randomUUID(),
                effectorId: counterId,
                timestamp: Date.now(),
                type: AgentRecordType.STATE_CHANGE,
                payload: {
                    count: 1,
                    lastOperation: CounterCommand.INCREMENT,
                    lastUpdated: Date.now()
                },
                metadata: {}
            })

            // Wait for state update to be processed
            let attempts = 0
            while (stateChanges.length === 0 && attempts < 20) {
                yield* Effect.sleep(50)
                attempts++
            }

            // Check final state
            const finalState = yield* counter.getState()
            expect(finalState.state.count).toBe(1)
            expect(finalState.state.lastOperation).toBe(CounterCommand.INCREMENT)

            // Terminate the counter
            const service = yield* EffectorService
            yield* service.terminate(counterId)
        })

        await Effect.runPromise(
            program.pipe(
                Effect.provide(EffectorService.Default)
            )
        )
    })

    it("should handle command processing", async () => {
        const program = Effect.gen(function* () {
            // Create a counter effector
            const counterId = makeEffectorId("test-counter")
            const counter = yield* createCounterEffector(counterId, 0)

            // Test initial state
            const initialState = yield* counter.getState()
            expect(initialState.state.count).toBe(0)

            // Set up state change listener
            const stateChanges: unknown[] = []
            const fiber = yield* pipe(
                counter.subscribe(),
                Stream.filter(record => record.type === AgentRecordType.STATE_CHANGE),
                Stream.tap(record => Effect.sync(() => stateChanges.push(record))),
                Stream.runDrain,
                Effect.fork
            )

            // Wait for subscription to be ready
            yield* Effect.sleep(100)

            // Send increment command
            yield* counter.send({
                id: crypto.randomUUID(),
                effectorId: counterId,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: { type: CounterCommand.INCREMENT },
                metadata: {}
            })

            // Wait for state change
            let attempts = 0
            while (stateChanges.length === 0 && attempts < 20) {
                yield* Effect.sleep(50)
                attempts++
            }

            if (stateChanges.length === 0) {
                throw new Error(`Failed to receive state change after ${attempts} attempts`)
            }

            // Check state change event
            const stateChange = stateChanges[0] as any
            expect(stateChange.type).toBe(AgentRecordType.STATE_CHANGE)
            expect(stateChange.payload.count).toBe(1)

            // Check final state
            const finalState = yield* counter.getState()
            expect(finalState.state.count).toBe(1)
            expect(finalState.state.lastOperation).toBe(CounterCommand.INCREMENT)

            // Terminate the counter
            const service = yield* EffectorService
            yield* service.terminate(counterId)
        })

        await Effect.runPromise(
            program.pipe(
                Effect.provide(EffectorService.Default)
            )
        )
    }, 10000)
}) 