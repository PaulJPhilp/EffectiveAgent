import { Effect, pipe } from "effect"
import { createActor } from "xstate"
import type { AgentRecord } from "../../effector/types.js"
import { AgentRecordType } from "../../effector/types.js"
import { getActionEffect } from "./actions.js"
import type { SupervisorEvent } from "./machine.js"
import { supervisorMachine } from "./machine.js"
import type { SupervisorCommand, SupervisorProcessState, SupervisorState } from "./types.js"

/**
 * Maps an AgentRecord to a SupervisorEvent for the XState machine
 */
const mapRecordToEvent = (record: AgentRecord): SupervisorEvent | null => {
    if (record.type === AgentRecordType.COMMAND) {
        const command = record.payload as { type: SupervisorCommand }
        if (command.type === SupervisorCommand.START_PROCESS) {
            const { taskAId, taskBId, correlationId } = record.payload as any
            if (taskAId && taskBId) {
                return {
                    type: "START_PROCESS",
                    taskAId,
                    taskBId,
                    correlationId
                }
            }
        }
        if (command.type === SupervisorCommand.ABORT_PROCESS) {
            return { type: "ABORT_PROCESS" }
        }
    }

    if (record.type === AgentRecordType.EVENT) {
        const event = record.payload as { type: string; error?: unknown }
        switch (event.type) {
            case "TASK_A_COMPLETED":
                return { type: "TASK_A_COMPLETED" }
            case "TASK_A_FAILED":
                return { type: "TASK_A_FAILED", error: event.error }
            case "TASK_B_COMPLETED":
                return { type: "TASK_B_COMPLETED" }
            case "TASK_B_FAILED":
                return { type: "TASK_B_FAILED", error: event.error }
        }
    }

    return null
}

/**
 * The supervisor's workflow function that processes AgentRecords and manages the state machine
 */
export const supervisorWorkflow = (
    record: AgentRecord,
    currentState: SupervisorState
): Effect.Effect<SupervisorState, Error> =>
    Effect.gen(function* (_) {
        // Create or rehydrate XState actor
        const actor = createActor(supervisorMachine).start(currentState.machineState)

        // Map AgentRecord to XState event
        const xstateEvent = mapRecordToEvent(record)
        if (!xstateEvent) {
            yield* Effect.logDebug("No relevant XState event for AgentRecord", { type: record.type })
            return currentState
        }

        // Send event to machine and get next state snapshot
        actor.send(xstateEvent)
        const nextMachineState = actor.getSnapshot()

        // Execute action Effects based on the transition
        if (nextMachineState.actions) {
            for (const action of nextMachineState.actions) {
                const actionName = typeof action === "string" ? action : action.type
                yield* Effect.logDebug("Executing action effect", { actionName })

                const actionEffect = getActionEffect(
                    actionName,
                    nextMachineState.context,
                    record.effectorId
                )

                if (actionEffect) {
                    yield* pipe(
                        actionEffect,
                        Effect.catchAllCause(cause =>
                            Effect.logError(`Action effect '${actionName}' failed`, cause)
                        )
                    )
                } else {
                    yield* Effect.logWarning(`No Effect implementation found for action: ${actionName}`)
                }
            }
        }

        // Update SupervisorState
        const nextState: SupervisorState = {
            ...currentState,
            machineState: nextMachineState,
            processState: nextMachineState.value as SupervisorProcessState,
            taskAId: nextMachineState.context.taskAId,
            taskBId: nextMachineState.context.taskBId,
            error: nextMachineState.context.error,
            lastCommand:
                record.type === AgentRecordType.COMMAND
                    ? (record.payload as { type: SupervisorCommand }).type
                    : currentState.lastCommand
        }

        // Set timestamps based on state transitions
        if (nextState.processState === "STARTING_TASK_A" && !nextState.startedAt) {
            nextState.startedAt = Date.now()
        } else if (
            ["COMPLETED", "FAILED"].includes(nextState.processState) &&
            !nextState.completedAt
        ) {
            nextState.completedAt = Date.now()
        }

        return nextState
    })