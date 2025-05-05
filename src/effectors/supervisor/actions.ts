import {
    AgentRecord,
    AgentRecordType,
    AgentRuntimeId,
    AgentRuntimeService
} from "@/agent-runtime/index.js"
import { Effect } from "effect"
import { v4 as uuid4 } from "uuid"
import type { SupervisorContext } from "./machine.js"
import { SupervisorEventType } from "./types.js"

/**
 * Creates an AgentRecord for logging
 */
const createLogRecord = (
    supervisorId: AgentRuntimeId,
    type: SupervisorEventType,
    payload: Record<string, unknown>,
    correlationId?: string
): AgentRecord => ({
    id: uuid4(),
    agentRuntimeId: supervisorId,
    timestamp: Date.now(),
    type: AgentRecordType.EVENT,
    payload: {
        type,
        ...payload as object
    },
    metadata: { correlationId }
})

/**
 * Creates a command AgentRecord to send to a task agent runtime
 */
const createTaskCommand = (
    taskId: AgentRuntimeId,
    supervisorId: AgentRuntimeId,
    correlationId?: string
): AgentRecord => ({
    id: uuid4(),
    agentRuntimeId: taskId,
    timestamp: Date.now(),
    type: AgentRecordType.COMMAND,
    payload: {
        type: "START_TASK"
    },
    metadata: {
        sourceAgentRuntimeId: supervisorId,
        correlationId
    }
})

/**
 * Map of action names to Effect-returning functions
 */
export const actionImplementations: Record<
    string,
    (context: SupervisorContext, supervisorId: AgentRuntimeId) => Effect.Effect<void, Error>
> = {
    sendStartA: (context, supervisorId) =>
        Effect.gen(function* (_) {
            const agentRuntimeService = yield* AgentRuntimeService
            if (!context.taskAId) {
                return yield* Effect.fail(new Error("taskAId missing in context"))
            }
            const command = createTaskCommand(context.taskAId, supervisorId, context.correlationId)
            yield* agentRuntimeService.send(context.taskAId, command)
        }),

    logStartA: (context, supervisorId) =>
        Effect.gen(function* (_) {
            const agentRuntimeService = yield* AgentRuntimeService
            const logRecord = createLogRecord(
                supervisorId,
                SupervisorEventType.TASK_A_INITIATED,
                { taskId: context.taskAId },
                context.correlationId
            )
            yield* agentRuntimeService.send(supervisorId, logRecord)
        }),

    sendStartB: (context, supervisorId) =>
        Effect.gen(function* (_) {
            const agentRuntimeService = yield* AgentRuntimeService
            if (!context.taskBId) {
                return yield* Effect.fail(new Error("taskBId missing in context"))
            }
            const command = createTaskCommand(context.taskBId, supervisorId, context.correlationId)
            yield* agentRuntimeService.send(context.taskBId, command)
        }),

    logStartB: (context, supervisorId) =>
        Effect.gen(function* (_) {
            const agentRuntimeService = yield* AgentRuntimeService
            const logRecord = createLogRecord(
                supervisorId,
                SupervisorEventType.TASK_B_INITIATED,
                { taskId: context.taskBId },
                context.correlationId
            )
            yield* agentRuntimeService.send(supervisorId, logRecord)
        }),

    logSuccess: (context, supervisorId) =>
        Effect.gen(function* (_) {
            const agentRuntimeService = yield* AgentRuntimeService
            const logRecord = createLogRecord(
                supervisorId,
                SupervisorEventType.PROCESS_COMPLETED,
                { status: "SUCCESS" },
                context.correlationId
            )
            yield* agentRuntimeService.send(supervisorId, logRecord)
        }),

    logFailureA: (context, supervisorId) =>
        Effect.gen(function* (_) {
            const agentRuntimeService = yield* AgentRuntimeService
            const logRecord = createLogRecord(
                supervisorId,
                SupervisorEventType.PROCESS_FAILED,
                {
                    status: "FAILED",
                    reason: "Task A Failed",
                    error: context.error
                },
                context.correlationId
            )
            yield* agentRuntimeService.send(supervisorId, logRecord)
        }),

    logFailureB: (context, supervisorId) =>
        Effect.gen(function* (_) {
            const agentRuntimeService = yield* AgentRuntimeService
            const logRecord = createLogRecord(
                supervisorId,
                SupervisorEventType.PROCESS_FAILED,
                {
                    status: "FAILED",
                    reason: "Task B Failed",
                    error: context.error
                },
                context.correlationId
            )
            yield* agentRuntimeService.send(supervisorId, logRecord)
        })
}

/**
 * Helper to get an Effect implementation for a given action
 */
export const getActionEffect = (
    actionName: string,
    context: SupervisorContext,
    supervisorId: AgentRuntimeId
): Effect.Effect<void, Error> | null => {
    const implementation = actionImplementations[actionName]
    return implementation ? implementation(context, supervisorId) : null
}