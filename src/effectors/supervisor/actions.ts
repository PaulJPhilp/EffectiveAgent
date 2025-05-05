import { Effect } from "effect"
import { ulid } from "ulid"
import { EffectorService } from "../../effector/service.js"
import type { AgentRecord, EffectorId } from "../../effector/types.js"
import { AgentRecordType } from "../../effector/types.js"
import type { SupervisorContext } from "./machine.js"
import type { SupervisorEventType } from "./types.js"

/**
 * Creates an AgentRecord for logging
 */
const createLogRecord = (
    supervisorId: EffectorId,
    type: SupervisorEventType,
    payload: unknown,
    correlationId?: string
): AgentRecord => ({
    id: ulid(),
    effectorId: supervisorId,
    timestamp: Date.now(),
    type: AgentRecordType.EVENT,
    payload: {
        type,
        ...payload
    },
    metadata: { correlationId }
})

/**
 * Creates a command AgentRecord to send to a task effector
 */
const createTaskCommand = (
    taskId: EffectorId,
    supervisorId: EffectorId,
    correlationId?: string
): AgentRecord => ({
    id: ulid(),
    effectorId: taskId,
    timestamp: Date.now(),
    type: AgentRecordType.COMMAND,
    payload: {
        type: "START_TASK"
    },
    metadata: {
        sourceEffectorId: supervisorId,
        correlationId
    }
})

/**
 * Map of action names to Effect-returning functions
 */
export const actionImplementations: Record<
    string,
    (context: SupervisorContext, supervisorId: EffectorId) => Effect.Effect<void, Error>
> = {
    sendStartA: (context, supervisorId) =>
        Effect.gen(function* (_) {
            const effectorService = yield* EffectorService
            if (!context.taskAId) {
                return yield* Effect.fail(new Error("taskAId missing in context"))
            }
            const command = createTaskCommand(context.taskAId, supervisorId, context.correlationId)
            yield* effectorService.send(context.taskAId, command)
        }),

    logStartA: (context, supervisorId) =>
        Effect.gen(function* (_) {
            const effectorService = yield* EffectorService
            const logRecord = createLogRecord(
                supervisorId,
                SupervisorEventType.TASK_A_INITIATED,
                { taskId: context.taskAId },
                context.correlationId
            )
            yield* effectorService.send(supervisorId, logRecord)
        }),

    sendStartB: (context, supervisorId) =>
        Effect.gen(function* (_) {
            const effectorService = yield* EffectorService
            if (!context.taskBId) {
                return yield* Effect.fail(new Error("taskBId missing in context"))
            }
            const command = createTaskCommand(context.taskBId, supervisorId, context.correlationId)
            yield* effectorService.send(context.taskBId, command)
        }),

    logStartB: (context, supervisorId) =>
        Effect.gen(function* (_) {
            const effectorService = yield* EffectorService
            const logRecord = createLogRecord(
                supervisorId,
                SupervisorEventType.TASK_B_INITIATED,
                { taskId: context.taskBId },
                context.correlationId
            )
            yield* effectorService.send(supervisorId, logRecord)
        }),

    logSuccess: (context, supervisorId) =>
        Effect.gen(function* (_) {
            const effectorService = yield* EffectorService
            const logRecord = createLogRecord(
                supervisorId,
                SupervisorEventType.PROCESS_COMPLETED,
                { status: "SUCCESS" },
                context.correlationId
            )
            yield* effectorService.send(supervisorId, logRecord)
        }),

    logFailureA: (context, supervisorId) =>
        Effect.gen(function* (_) {
            const effectorService = yield* EffectorService
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
            yield* effectorService.send(supervisorId, logRecord)
        }),

    logFailureB: (context, supervisorId) =>
        Effect.gen(function* (_) {
            const effectorService = yield* EffectorService
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
            yield* effectorService.send(supervisorId, logRecord)
        })
}

/**
 * Helper to get an Effect implementation for a given action
 */
export const getActionEffect = (
    actionName: string,
    context: SupervisorContext,
    supervisorId: EffectorId
): Effect.Effect<void, Error> | null => {
    const implementation = actionImplementations[actionName]
    return implementation ? implementation(context, supervisorId) : null
}