import {
    AgentRecordType,
    AgentRuntimeService,
    makeAgentRuntimeId
} from "@/agent-runtime/index.js"
import { createServiceTestHarness } from "@/testing/service.js"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { ControllerCommand, createControllerRuntime } from "../controller.js"

const harness = createServiceTestHarness(AgentRuntimeService)

describe("ControllerRuntime", () => {
    it("should initialize with empty state", () =>
        harness.run(Effect.gen(function* () {
            const id = makeAgentRuntimeId("test-controller")
            const controller = yield* createControllerRuntime(id)

            const state = yield* controller.getState()
            expect(state.state.managedRuntimes).toHaveLength(0)
        }))
    )

    it("should create and manage counter runtimes", async () => {
        await harness.run(Effect.gen(function* () {
            const id = makeAgentRuntimeId("test-controller")
            const controller = yield* createControllerRuntime(id)

            // Send create counter command
            yield* controller.send({
                id: "test-command",
                agentRuntimeId: id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: {
                    type: ControllerCommand.CREATE_COUNTER,
                    initialCount: 0
                },
                metadata: {}
            })

            // Wait a bit for counter to be created
            yield* Effect.sleep(100)

            // Verify counter was created
            const state = yield* controller.getState()
            expect(state.state.managedRuntimes).toHaveLength(1)

            const counter = state.state.managedRuntimes[0]
            expect(counter.id).toBeDefined()
            expect(counter.createdAt).toBeDefined()
        }))
    })

    it("should remove managed counter runtimes", async () => {
        await harness.run(Effect.gen(function* () {
            const id = makeAgentRuntimeId("test-controller")
            const controller = yield* createControllerRuntime(id)

            // Create counter
            yield* controller.send({
                id: "create-command",
                agentRuntimeId: id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: {
                    type: ControllerCommand.CREATE_COUNTER,
                    initialCount: 0
                },
                metadata: {}
            })

            // Wait for counter to be created
            yield* Effect.sleep(100)

            // Get counter ID
            const state = yield* controller.getState()
            const counterId = state.state.managedRuntimes[0].id

            // Remove counter
            yield* controller.send({
                id: "remove-command",
                agentRuntimeId: id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: {
                    type: ControllerCommand.REMOVE_COUNTER,
                    counterId
                },
                metadata: {}
            })

            // Wait for counter to be removed
            yield* Effect.sleep(100)

            // Verify counter was removed
            const updatedState = yield* controller.getState()
            expect(updatedState.state.managedRuntimes).toHaveLength(0)
        }))
    })
})