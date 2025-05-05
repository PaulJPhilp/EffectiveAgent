import {
    AgentRuntime,
    AgentRuntimeId,
    AgentRuntimeService,
    makeAgentRuntimeId
} from "@/agent-runtime/index.js"
import { Effect } from "effect"
import { createActor } from "xstate"
import { supervisorMachine } from "./machine.js"
import type { SupervisorContext, SupervisorState } from "./types.js"
import { SupervisorProcessState } from "./types.js"
import { supervisorWorkflow } from "./workflow.js"

export * from "./types.js"

/**
 * Creates an ID for a supervisor agent runtime
 */
export const makeSupervisorId = (id: string): AgentRuntimeId => makeAgentRuntimeId(`supervisor-${id}`)

/**
 * Creates a new supervisor agent runtime instance
 */
export const createSupervisorRuntime = (id: string): Effect.Effect<AgentRuntime<SupervisorState>> =>
    Effect.gen(function* (_) {
        const agentRuntimeService = yield* AgentRuntimeService

        // Create initial state with a fresh XState actor
        const initialActor = createActor(supervisorMachine)
        const initialMachineState = initialActor.getSnapshot()

        // Create initial context with machine state
        const initialContext: SupervisorContext = {
            processState: SupervisorProcessState.IDLE,
            machineState: initialMachineState
        }

        // Create the supervisor agent runtime with the workflow
        const supervisorId = makeSupervisorId(id)
        return yield* agentRuntimeService.create(
            supervisorId,
            initialContext,
            supervisorWorkflow(supervisorId)
        )
    })