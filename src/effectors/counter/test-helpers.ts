import { makeEffectorId, type AgentRecord, AgentRecordType, type MessagePriority } from "../effector/types.js"
import type { CounterCommand } from "./types.js"

/**
 * Creates an AgentRecord for a CounterCommand
 */
export const createCounterRecord = (
    effectorId: string,
    command: CounterCommand,
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
