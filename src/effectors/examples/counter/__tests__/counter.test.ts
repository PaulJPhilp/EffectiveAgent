import {
    AgentRecordType,
    AgentRuntimeService,
    makeAgentRuntimeId
} from "@/agent-runtime/index.js"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { CounterCommand, createCounterRuntime } from "../counter.js"

// Helper to run Effect as Promise
const runTest = <E, A>(effect: Effect.Effect<A, E>): Promise<A> =>
    Effect.runPromise(effect)

describe("CounterRuntime", () => {
    it("should handle increment commands", () =>
        runTest(Effect.gen(function* () {
            // Create a counter runtime
            const counterId = makeAgentRuntimeId("test-counter")
            const counter = yield* createCounterRuntime(counterId, 0)

            // Get initial state
            const initialState = yield* counter.getState()
            expect(initialState.state.count).toBe(0)

            // Send increment command
            yield* counter.send({
                id: "test-command",
                agentRuntimeId: counterId,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: {
                    type: CounterCommand.INCREMENT
                },
                metadata: {}
            })

            // Get updated state
            const updatedState = yield* counter.getState()
            expect(updatedState.state.count).toBe(1)
            expect(updatedState.state.lastOperation).toBe(CounterCommand.INCREMENT)
            expect(updatedState.state.lastUpdated).toBeDefined()
        }).pipe(
            Effect.provide(AgentRuntimeService.Default)
        ))
    )

    it("should handle decrement commands", () =>
        runTest(Effect.gen(function* () {
            // Create a counter runtime
            const counterId = makeAgentRuntimeId("test-counter")
            const counter = yield* createCounterRuntime(counterId, 0)

            // Get initial state
            const initialState = yield* counter.getState()
            expect(initialState.state.count).toBe(0)

            // Send decrement command
            yield* counter.send({
                id: "test-command",
                agentRuntimeId: counterId,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: {
                    type: CounterCommand.DECREMENT
                },
                metadata: {}
            })

            // Get updated state
            const updatedState = yield* counter.getState()
            expect(updatedState.state.count).toBe(-1)
            expect(updatedState.state.lastOperation).toBe(CounterCommand.DECREMENT)
            expect(updatedState.state.lastUpdated).toBeDefined()
        }).pipe(
            Effect.provide(AgentRuntimeService.Default)
        ))
    )

    it("should handle reset commands", () =>
        runTest(Effect.gen(function* () {
            const service = yield* AgentRuntimeService
            const counterId = makeAgentRuntimeId("test-counter")
            const counter = yield* createCounterRuntime(counterId, 5)

            // Send reset command
            yield* counter.send({
                id: "test-command",
                agentRuntimeId: counterId,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: {
                    type: CounterCommand.RESET
                },
                metadata: {}
            })

            // Get updated state
            const updatedState = yield* counter.getState()
            expect(updatedState.state.count).toBe(0)
            expect(updatedState.state.lastOperation).toBe(CounterCommand.RESET)
            expect(updatedState.state.lastUpdated).toBeDefined()
        }).pipe(
            Effect.provide(AgentRuntimeService.Default)
        ))
    )
})