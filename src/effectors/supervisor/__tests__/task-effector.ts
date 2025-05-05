import { Effect } from "effect"
import { ulid } from "ulid"
import { EffectorService } from "../../../effector/service.js"
import type { AgentRecord, Effector, EffectorId } from "../../../effector/types.js"
import { AgentRecordType, makeEffectorId } from "../../../effector/types.js"

// Task effector types
export const TaskCommand = {
    START_TASK: "START_TASK",
} as const

export type TaskCommand = typeof TaskCommand[keyof typeof TaskCommand]

export interface TaskState {
    isRunning: boolean
    startedAt?: number
    completedAt?: number
    error?: unknown
}

/**
 * Creates a test task effector that can simulate success or failure
 */
export const createTaskEffector = (
    name: string,
    shouldFail = false,
    delayMs = 100
): Effect.Effect<Effector<TaskState>> =>
    Effect.gen(function* (_) {
        const effectorService = yield* EffectorService

        // Create task effector with processing logic
        const effector = yield* effectorService.create<TaskState>(
            makeEffectorId(`task-${name}`),
            { isRunning: false },
            (record: AgentRecord, state: TaskState): Effect.Effect<TaskState> =>
                Effect.gen(function* (_) {
                    // Only handle START_TASK commands
                    if (
                        record.type !== AgentRecordType.COMMAND ||
                        (record.payload as { type: string }).type !== TaskCommand.START_TASK
                    ) {
                        return state
                    }

                    // Extract correlation ID if present
                    const correlationId = record.metadata?.correlationId
                    const supervisorId = record.metadata?.sourceEffectorId as EffectorId

                    if (!supervisorId) {
                        return {
                            ...state,
                            error: new Error("Missing sourceEffectorId in command metadata")
                        }
                    }

                    // Simulate task execution with delay
                    yield* Effect.sleep(delayMs)

                    if (shouldFail) {
                        // Send failure event
                        const failureEvent: AgentRecord = {
                            id: ulid(),
                            effectorId: supervisorId,
                            timestamp: Date.now(),
                            type: AgentRecordType.EVENT,
                            payload: {
                                type: `TASK_${name.toUpperCase()}_FAILED`,
                                error: new Error(`Task ${name} failed`)
                            },
                            metadata: { correlationId }
                        }
                        yield* effectorService.send(supervisorId, failureEvent)

                        return {
                            isRunning: false,
                            error: new Error(`Task ${name} failed`),
                            startedAt: state.startedAt,
                            completedAt: Date.now()
                        }
                    } else {
                        // Send success event
                        const successEvent: AgentRecord = {
                            id: ulid(),
                            effectorId: supervisorId,
                            timestamp: Date.now(),
                            type: AgentRecordType.EVENT,
                            payload: {
                                type: `TASK_${name.toUpperCase()}_COMPLETED`
                            },
                            metadata: { correlationId }
                        }
                        yield* effectorService.send(supervisorId, successEvent)

                        return {
                            isRunning: false,
                            startedAt: state.startedAt,
                            completedAt: Date.now()
                        }
                    }
                })
        )

        return effector
    })