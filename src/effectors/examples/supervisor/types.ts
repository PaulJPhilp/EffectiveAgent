import { EffectorId } from "../../effector/types.js"

export type SupervisorId = EffectorId

/**
 * Commands that can be sent to the SupervisorEffector
 */
export const SupervisorCommand = {
    START_PROCESS: "START_PROCESS",
    ABORT_PROCESS: "ABORT_PROCESS"
} as const

export type SupervisorCommand = typeof SupervisorCommand[keyof typeof SupervisorCommand]

/**
 * Events emitted by the SupervisorEffector
 */
export const SupervisorEventType = {
    PROCESS_STARTED: "PROCESS_STARTED",
    TASK_A_INITIATED: "TASK_A_INITIATED",
    TASK_A_COMPLETED: "TASK_A_COMPLETED",
    TASK_A_FAILED: "TASK_A_FAILED",
    TASK_B_INITIATED: "TASK_B_INITIATED",
    TASK_B_COMPLETED: "TASK_B_COMPLETED",
    TASK_B_FAILED: "TASK_B_FAILED",
    PROCESS_COMPLETED: "PROCESS_COMPLETED",
    PROCESS_FAILED: "PROCESS_FAILED"
} as const

export type SupervisorEventType = typeof SupervisorEventType[keyof typeof SupervisorEventType]

/**
 * Possible states of the workflow
 */
export const SupervisorProcessState = {
    IDLE: "IDLE",
    STARTING_TASK_A: "STARTING_TASK_A",
    WAITING_FOR_TASK_A: "WAITING_FOR_TASK_A",
    STARTING_TASK_B: "STARTING_TASK_B",
    WAITING_FOR_TASK_B: "WAITING_FOR_TASK_B",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED"
} as const

export type SupervisorProcessState = typeof SupervisorProcessState[keyof typeof SupervisorProcessState]

/**
 * State managed by the SupervisorEffector
 */
export interface SupervisorState {
    /** Current state of the workflow */
    processState: SupervisorProcessState
    /** IDs of the task effectors being coordinated */
    taskAId?: EffectorId
    taskBId?: EffectorId
    /** Timestamps for tracking progress */
    startedAt?: number
    completedAt?: number
    /** Error information if process failed */
    error?: unknown
    /** Last command received */
    lastCommand?: SupervisorCommand
}