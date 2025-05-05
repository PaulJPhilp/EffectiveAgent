import { assign, createMachine } from "xstate"
import type { EffectorId } from "../effector/types.js"

/**
 * Context maintained by the state machine
 */
export interface SupervisorContext {
    taskAId?: EffectorId
    taskBId?: EffectorId
    correlationId?: string
    error?: unknown
}

/**
 * Events that can trigger state transitions
 */
export type SupervisorEvent =
    | { type: "START_PROCESS"; taskAId: EffectorId; taskBId: EffectorId; correlationId?: string }
    | { type: "TASK_A_COMPLETED" }
    | { type: "TASK_A_FAILED"; error?: unknown }
    | { type: "TASK_B_COMPLETED" }
    | { type: "TASK_B_FAILED"; error?: unknown }
    | { type: "ABORT_PROCESS" }

/**
 * Actions that can be performed during transitions
 */
export type SupervisorAction =
    | { type: "assignInitialContext" }
    | { type: "sendStartA" }
    | { type: "logStartA" }
    | { type: "sendStartB" }
    | { type: "logStartB" }
    | { type: "logSuccess" }
    | { type: "logFailureA" }
    | { type: "logFailureB" }
    | { type: "assignErrorA" }
    | { type: "assignErrorB" }

/**
 * The state machine definition
 */
export const supervisorMachine = createMachine({
    id: "supervisor",
    types: {} as {
        context: SupervisorContext
        events: SupervisorEvent
        actions: SupervisorAction
    },
    initial: "idle",
    context: {
        taskAId: undefined,
        taskBId: undefined,
        correlationId: undefined,
        error: undefined
    },
    states: {
        idle: {
            on: {
                START_PROCESS: {
                    target: "startingTaskA",
                    actions: assign({
                        taskAId: ({ event }) => event.taskAId,
                        taskBId: ({ event }) => event.taskBId,
                        correlationId: ({ event }) => event.correlationId,
                        error: (_) => undefined // Clear any previous errors
                    })
                }
            }
        },
        startingTaskA: {
            entry: ["sendStartA", "logStartA"],
            always: { target: "waitingForTaskA" }
        },
        waitingForTaskA: {
            on: {
                TASK_A_COMPLETED: {
                    target: "startingTaskB"
                },
                TASK_A_FAILED: {
                    target: "failed",
                    actions: assign({
                        error: ({ event }) => event.error
                    })
                },
                ABORT_PROCESS: {
                    target: "failed",
                    actions: assign({
                        error: (_) => new Error("Process aborted while waiting for Task A")
                    })
                }
            }
        },
        startingTaskB: {
            entry: ["sendStartB", "logStartB"],
            always: { target: "waitingForTaskB" }
        },
        waitingForTaskB: {
            on: {
                TASK_B_COMPLETED: {
                    target: "completed"
                },
                TASK_B_FAILED: {
                    target: "failed",
                    actions: assign({
                        error: ({ event }) => event.error
                    })
                },
                ABORT_PROCESS: {
                    target: "failed",
                    actions: assign({
                        error: (_) => new Error("Process aborted while waiting for Task B")
                    })
                }
            }
        },
        completed: {
            type: "final",
            entry: ["logSuccess"]
        },
        failed: {
            type: "final",
            entry: ["logFailureA", "logFailureB"]
        }
    },
    on: {
        ABORT_PROCESS: {
            target: "failed",
            actions: assign({
                error: (_) => new Error("Process aborted")
            })
        }
    }
})