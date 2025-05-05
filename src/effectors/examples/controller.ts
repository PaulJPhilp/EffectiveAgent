import {
    AgentRuntime,
    AgentRuntimeId,
    AgentRuntimeService
} from "@/agent-runtime/index.js"
import { Effect, pipe } from "effect"

/**
 * Commands that can be sent to the controller
 */
export const ControllerCommand = {
    CREATE_COUNTER: "CREATE_COUNTER",
    REMOVE_COUNTER: "REMOVE_COUNTER"
} as const

export type ControllerCommand = typeof ControllerCommand[keyof typeof ControllerCommand]

/**
 * State for tracking a managed counter runtime
 */
export interface ManagedCounter {
    id: AgentRuntimeId
    createdAt: number
}

/**
 * State maintained by the controller
 */
export interface ControllerState {
    /** List of managed counter runtimes */
    managedRuntimes: ManagedCounter[]
}

/**
 * Creates a new controller runtime
 */
export const createControllerRuntime = (
    id: AgentRuntimeId
): Effect.Effect<AgentRuntime<ControllerState>> =>
    pipe(
        AgentRuntimeService,
        Effect.flatMap(service =>
            service.create(id, {
                managedRuntimes: []
            })
        )
    )