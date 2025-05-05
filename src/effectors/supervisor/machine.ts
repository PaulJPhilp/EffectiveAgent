import { assign, createMachine } from "xstate"
import type { SupervisorState } from "./types.js"
import { SupervisorEventType, SupervisorProcessState } from "./types.js"

/**
 * Context maintained by the supervisor state machine
 */
export interface SupervisorContext extends SupervisorState {
    /** Correlation ID for tracking related events */
    correlationId?: string
    /** Current state of the state machine */
    machineState: any
}

/**
 * State machine definition for the supervisor agent runtime
 */
export const supervisorMachine = createMachine<SupervisorContext>({
    id: "supervisor",
    initial: "idle",
    context: {
        processState: SupervisorProcessState.IDLE
    },
    states: {
        idle: {
            on: {
                START_PROCESS: {
                    target: "taskA",
                    actions: [
                        assign({
                            processState: SupervisorProcessState.TASK_A_RUNNING,
                            startedAt: () => Date.now()
                        }),
                        "sendStartA",
                        "logStartA"
                    ]
                }
            }
        },
        taskA: {
            on: {
                [SupervisorEventType.TASK_A_COMPLETED]: {
                    target: "taskB",
                    actions: [
                        assign({
                            processState: SupervisorProcessState.TASK_B_RUNNING
                        }),
                        "sendStartB",
                        "logStartB"
                    ]
                },
                [SupervisorEventType.TASK_A_FAILED]: {
                    target: "failed",
                    actions: [
                        assign({
                            processState: SupervisorProcessState.FAILED,
                            completedAt: () => Date.now(),
                            error: (_, event) => event.error
                        }),
                        "logFailureA"
                    ]
                }
            }
        },
        taskB: {
            on: {
                [SupervisorEventType.TASK_B_COMPLETED]: {
                    target: "completed",
                    actions: [
                        assign({
                            processState: SupervisorProcessState.COMPLETED,
                            completedAt: () => Date.now()
                        }),
                        "logSuccess"
                    ]
                },
                [SupervisorEventType.TASK_B_FAILED]: {
                    target: "failed",
                    actions: [
                        assign({
                            processState: SupervisorProcessState.FAILED,
                            completedAt: () => Date.now(),
                            error: (_, event) => event.error
                        }),
                        "logFailureB"
                    ]
                }
            }
        },
        completed: {
            type: "final"
        },
        failed: {
            type: "final"
        }
    }
})