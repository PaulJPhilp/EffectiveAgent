import { AgentRuntimeId } from "@/agent-runtime/index.js"

export type SupervisorId = AgentRuntimeId

/**
 * Commands that can be sent to the SupervisorRuntime
 */
export const SupervisorCommand = {
    START_PROCESS: "START_PROCESS",
    ABORT_PROCESS: "ABORT_PROCESS"
} as const

export type SupervisorCommand = typeof SupervisorCommand[keyof typeof SupervisorCommand]

/**
 * Events emitted by the SupervisorRuntime
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
 * States of the supervisor workflow
 */
export const SupervisorProcessState = {
    IDLE: "IDLE",
    TASK_A_RUNNING: "TASK_A_RUNNING",
    TASK_B_RUNNING: "TASK_B_RUNNING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    ABORTED: "ABORTED"
} as const

export type SupervisorProcessState = typeof SupervisorProcessState[keyof typeof SupervisorProcessState]

/**
 * State managed by the SupervisorRuntime
 */
export interface SupervisorState {
    /** Current state of the workflow */
    processState: SupervisorProcessState
    /** IDs of the task agent runtimes being coordinated */
    taskAId?: AgentRuntimeId
    taskBId?: AgentRuntimeId
    /** Timestamps for tracking progress */
    startedAt?: number
    completedAt?: number
    /** Error information if process failed */
    error?: unknown
    /** Last command received */
    lastCommand?: SupervisorCommand
}