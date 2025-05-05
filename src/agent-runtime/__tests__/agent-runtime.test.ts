import { Effect } from "effect"
import { describe, expect, test } from "vitest"
import { AgentRecordType, AgentRuntimeService, makeAgentRuntimeId } from "../index.js"

describe("AgentRuntime", () => {
    test("basic lifecycle operations", async () => {
        const service = new AgentRuntimeService()
        const id = makeAgentRuntimeId("test-agent")

        // Create agent runtime
        const runtime = await Effect.runPromise(
            service.create(id, { count: 0 })
        )
        expect(runtime).toBeDefined()
        expect(runtime.id).toBe(id)

        // Get initial state
        const initialState = await Effect.runPromise(
            service.getState(id)
        )
        expect(initialState.state).toEqual({ count: 0 })
        expect(initialState.status).toBe("IDLE")

        // Send a record
        const record = {
            id: "test-record",
            agentRuntimeId: id,
            timestamp: Date.now(),
            type: AgentRecordType.COMMAND,
            payload: { increment: 1 },
            metadata: {}
        }

        await Effect.runPromise(
            service.send(id, record)
        )

        // Terminate
        await Effect.runPromise(
            service.terminate(id)
        )

        // Verify terminated
        await expect(
            Effect.runPromise(service.getState(id))
        ).rejects.toThrow()
    })
})