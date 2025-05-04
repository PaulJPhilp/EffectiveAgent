import { Effect } from "effect"

/**
 * Base class for all controller commands
 */
export abstract class ControllerCommand {
    abstract readonly _tag: string
}

/**
 * Commands that can be sent to the ControllerEffector
 */
export namespace ControllerCommand {
    export class Start extends ControllerCommand {
        readonly _tag = "Start"
    }

    export class Stop extends ControllerCommand {
        readonly _tag = "Stop"
    }

    export class Pause extends ControllerCommand {
        readonly _tag = "Pause"
    }

    export class Resume extends ControllerCommand {
        readonly _tag = "Resume"
    }

    export class Reset extends ControllerCommand {
        readonly _tag = "Reset"
    }
}

/**
 * The current status of the controlled process
 */
export const ControllerStatus = {
    IDLE: "IDLE",
    RUNNING: "RUNNING",
    PAUSED: "PAUSED",
    STOPPED: "STOPPED",
    ERROR: "ERROR"
} as const

export type ControllerStatus = typeof ControllerStatus[keyof typeof ControllerStatus]

/**
 * The state maintained by the ControllerEffector
 */
export interface ControllerState {
    readonly status: ControllerStatus
    readonly startTime?: number
    readonly pausedAt?: number
    readonly totalPausedTime: number
    readonly history: Array<{
        command: ControllerCommand
        timestamp: number
        previousStatus: ControllerStatus
        newStatus: ControllerStatus
    }>
}
