import { Effect } from "effect"
import { describe, expect, test } from "vitest"
import { AgentRecordType, AgentRuntimeService, makeAgentRuntimeId } from "../index.js"

describe("AgentRuntime", () => {
    test("basic lifecycle operations", async () => {
        await Effect.runPromise(
            Effect.provide(
                Effect.gen(function* () {
                    const service = yield* AgentRuntimeService
                    const id = makeAgentRuntimeId("test-agent")

                    // Create agent runtime
                    const runtime = yield* service.create(id, { count: 0 })
                    expect(runtime).toBeDefined()
                    expect(runtime.id).toBe(id)

                    // Get initial state
                    const initialState = yield* service.getState(id)
                    expect(initialState.state).toEqual({ count: 0 })
                    expect(initialState.status).toBe("IDLE")

                    // Send a record
                    const record = {
                        id: "test-record",
                        agentRuntimeId: id,
                        timestamp: Date.now(),
                        type: AgentRecordType.COMMAND,
                        payload: { increment: 1 },
                        metadata: {},
                        sequence: 1
                    }

                    yield* service.send(id, record)

                    // Terminate
                    yield* service.terminate(id)

                    // Verify terminated - should fail when trying to get state
                    const stateResult = yield* Effect.either(service.getState(id))
                    expect(stateResult._tag).toBe("Left")
                }),
                AgentRuntimeService.Default
            )
        )
    })
})