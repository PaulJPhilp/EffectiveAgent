import { Effect, pipe } from "effect"
import type { Effector } from "../../effector/api.js"
import { EffectorService } from "../../effector/service.js"
import type { AgentRecord, EffectorId } from "../../effector/types.js"
import { AgentRecordType } from "../../effector/types.js"

/**
 * Commands that can be sent to TaskEffectorA
 */
export const TaskACommand = {
    START_TASK: "START_TASK"
} as const

export type TaskACommand = typeof TaskACommand[keyof typeof TaskACommand]

/**
 * Events emitted by TaskEffectorA
 */
export const TaskAEventType = {
    TASK_STARTED: "TASK_STARTED",
    TASK_COMPLETED: "TASK_COMPLETED",
    TASK_FAILED: "TASK_FAILED"
} as const

export type TaskAEventType = typeof TaskAEventType[keyof typeof TaskAEventType]

/**
 * Status of the task
 */
export const TaskAStatus = {
    IDLE: "IDLE",
    PROCESSING: "PROCESSING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED"
} as const

export type TaskAStatus = typeof TaskAStatus[keyof typeof TaskAStatus]

/**
 * State maintained by TaskEffectorA
 */
export interface TaskAState {
    status: TaskAStatus
    startedAt?: number
    completedAt?: number
    result?: unknown
    error?: unknown
}

/**
 * Creates a new TaskEffectorA instance
 */
export const createTaskEffectorA = (
    id: EffectorId,
    simulatedDelay: number = 1000,
    simulatedSuccessRate: number = 0.8
): Effect.Effect<Effector<TaskAState>> => {
    // Initial state
    const initialState: TaskAState = {
        status: TaskAStatus.IDLE
    }

    // Processing logic
    const processingLogic = (record: AgentRecord, state: TaskAState) => {
        if (record.type !== AgentRecordType.COMMAND ||
            (state.status !== TaskAStatus.IDLE && record.payload.type === TaskACommand.START_TASK)) {
            return Effect.succeed(state)
        }

        const command = record.payload as { type: TaskACommand }

        switch (command.type) {
            case TaskACommand.START_TASK: {
                // Emit TASK_STARTED event
                const startEvent: AgentRecord = {
                    id: crypto.randomUUID(),
                    effectorId: id,
                    timestamp: Date.now(),
                    type: AgentRecordType.EVENT,
                    payload: {
                        type: TaskAEventType.TASK_STARTED
                    },
                    metadata: {}
                }

                // Simulate task processing
                return pipe(
                    // First emit start event
                    Effect.sync(() => startEvent),
                    Effect.tap(event => EffectorService.send(id, event)),

                    // Update state to PROCESSING
                    Effect.map(() => ({
                        ...state,
                        status: TaskAStatus.PROCESSING,
                        startedAt: Date.now()
                    })),

                    // Simulate processing delay
                    Effect.tap(() => Effect.sleep(simulatedDelay)),

                    // Simulate success/failure
                    Effect.flatMap(() =>
                        Effect.sync(() => Math.random() < simulatedSuccessRate)
                    ),

                    // Handle success/failure
                    Effect.flatMap(success => {
                        if (success) {
                            const result = { data: "Simulated data preparation result" }
                            const successEvent: AgentRecord = {
                                id: crypto.randomUUID(),
                                effectorId: id,
                                timestamp: Date.now(),
                                type: AgentRecordType.EVENT,
                                payload: {
                                    type: TaskAEventType.TASK_COMPLETED,
                                    result
                                },
                                metadata: {}
                            }

                            return pipe(
                                Effect.sync(() => successEvent),
                                Effect.tap(event => EffectorService.send(id, event)),
                                Effect.map(() => ({
                                    ...state,
                                    status: TaskAStatus.COMPLETED,
                                    completedAt: Date.now(),
                                    result,
                                    error: undefined
                                }))
                            )
                        } else {
                            const error = new Error("Task A simulated failure")
                            const failureEvent: AgentRecord = {
                                id: crypto.randomUUID(),
                                effectorId: id,
                                timestamp: Date.now(),
                                type: AgentRecordType.EVENT,
                                payload: {
                                    type: TaskAEventType.TASK_FAILED,
                                    error: error.message
                                },
                                metadata: {}
                            }

                            return pipe(
                                Effect.sync(() => failureEvent),
                                Effect.tap(event => EffectorService.send(id, event)),
                                Effect.map(() => ({
                                    ...state,
                                    status: TaskAStatus.FAILED,
                                    completedAt: Date.now(),
                                    result: undefined,
                                    error
                                }))
                            )
                        }
                    })
                )
            }
            default:
                return Effect.succeed(state)
        }
    }

    // Create and return the effector instance
    return pipe(
        EffectorService,
        Effect.flatMap(service => service.create(id, initialState))
    )
}