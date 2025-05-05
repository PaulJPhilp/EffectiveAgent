import { AgentRecord, AgentRuntimeId } from "@/agent-runtime/index.js"
import { Effect } from "effect"
import { interpret } from "xstate"
import { getActionEffect } from "./actions.js"
import { SupervisorContext, supervisorMachine } from "./machine.js"
import { SupervisorEventType } from "./types.js"

/**
 * Core supervisor workflow logic.
 * Processes records using a state machine.
 */
export const supervisorWorkflow = (supervisorId: AgentRuntimeId) =>
    (record: AgentRecord, context: SupervisorContext): Effect.Effect<SupervisorContext> =>
        Effect.gen(function* () {
            // Create a new interpreter for this event
            const service = interpret(supervisorMachine)
                .start(context.machineState)

            // Wait for machine to settle after sending event
            const nextState = yield* Effect.promise(() => new Promise((resolve) => {
                // Set up one-time listener for state changes
                const unsubscribe = service.subscribe((state) => {
                    unsubscribe()
                    resolve(state)
                })

                // Send event to machine based on record type
                if (record.type === "EVENT") {
                    const payload = record.payload as { type: SupervisorEventType }
                    service.send({ type: payload.type })
                } else if (record.type === "COMMAND") {
                    service.send(record.payload)
                }
            }))

            // Get all pending actions
            const actions = nextState.actions.filter(action => action.type === "effectFn")

            // Execute effects sequentially
            for (const action of actions) {
                const effect = getActionEffect(action.name, nextState.context, supervisorId)
                if (effect) {
                    yield* effect
                }
            }

            // Return new context with updated machine state
            return {
                ...nextState.context,
                machineState: nextState
            }
        })