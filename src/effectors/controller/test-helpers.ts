import { makeEffectorId, type AgentRecord, AgentRecordType, type MessagePriority } from "../effector/types.js"
import type { ControllerCommand } from "./types.js"

/**
 * Creates an AgentRecord for a ControllerCommand
 */
export const createControllerRecord = (
    effectorId: string,
    command: ControllerCommand,
    options: {
        priority?: MessagePriority
        correlationId?: string
    } = {}
): AgentRecord => ({
    id: `${effectorId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    effectorId: makeEffectorId(effectorId),
    timestamp: Date.now(),
    type: AgentRecordType.COMMAND,
    payload: command,
    metadata: {
        priority: options.priority,
        correlationId: options.correlationId
    }
})
