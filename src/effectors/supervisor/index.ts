import { Effect } from "effect"
import { createActor } from "xstate"
import { EffectorService } from "../../effector/service.js"
import type { Effector } from "../../effector/types.js"
import { makeEffectorId } from "../../effector/types.js"
import { supervisorMachine } from "./machine.js"
import type { SupervisorState } from "./types.js"
import { supervisorWorkflow } from "./workflow.js"

export * from "./types.js"

/**
 * Creates an ID for a supervisor effector
 */
export const makeSupervisorId = (id: string) => makeEffectorId(`supervisor-${id}`)

/**
 * Creates a new supervisor effector instance
 */
export const createSupervisorEffector = (id: string): Effect.Effect<Effector<SupervisorState>> =>
    Effect.gen(function* (_) {
        const effectorService = yield* EffectorService

        // Create initial state with a fresh XState actor
        const initialMachineState = createActor(supervisorMachine).getSnapshot()
        const initialState: SupervisorState = {
            machineState: initialMachineState,
            processState: initialMachineState.value
        }

        // Create the supervisor effector
        return yield* effectorService.create(makeSupervisorId(id), initialState, supervisorWorkflow)
    })