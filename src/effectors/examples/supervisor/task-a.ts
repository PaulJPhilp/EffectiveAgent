import {
    AgentRecord,
    AgentRecordType,
    AgentRuntime,
    AgentRuntimeId,
    AgentRuntimeService
} from "@/agent-runtime/index.js"
import { Effect, pipe } from "effect"

/**
 * Commands that can be sent to TaskRuntimeA
 */
export const TaskACommand = {
    START_TASK: "START_TASK"
} as const

export type TaskACommand = typeof TaskACommand[keyof typeof TaskACommand]

/**
 * Events emitted by TaskRuntimeA
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
 * State maintained by TaskRuntimeA
 */
export interface TaskAState {
    status: TaskAStatus
    startedAt?: number
    completedAt?: number
    result?: unknown
    error?: unknown
}

/**
 * Creates a new TaskRuntimeA instance
 */
export const createTaskRuntimeA = (
    id: AgentRuntimeId,
    simulatedDelay: number = 1000,
    simulatedSuccessRate: number = 0.8
): Effect.Effect<AgentRuntime<TaskAState>> => {
    // Initial state
    const initialState: TaskAState = {
        status: TaskAStatus.IDLE
    }

    // Processing logic
    const workflow = (record: AgentRecord, state: TaskAState) => {
        if (record.type !== AgentRecordType.COMMAND ||
            (state.status !== TaskAStatus.IDLE && record.payload.type === TaskACommand.START_TASK)) {
            return Effect.succeed(state)
        }

        const command = record.payload as { type: TaskACommand }

        switch (command.type) {
            case TaskACommand.START_TASK: {
                return pipe(
                    Effect.succeed({
                        ...state,
                        status: TaskAStatus.PROCESSING,
                        startedAt: Date.now()
                    }),
                    Effect.tap(newState => Effect.gen(function* () {
                        // Emit started event
                        const startedEvent: AgentRecord = {
                            id: crypto.randomUUID(),
                            agentRuntimeId: id,
                            timestamp: Date.now(),
                            type: AgentRecordType.EVENT,
                            payload: {
                                type: TaskAEventType.TASK_STARTED
                            },
                            metadata: {}
                        }

                        const agentRuntimeService = yield* AgentRuntimeService
                        yield* agentRuntimeService.send(id, startedEvent)
                    })),
                    Effect.tap(() => Effect.sleep(simulatedDelay)),
                    Effect.flatMap(() =>
                        Effect.sync(() => Math.random() < simulatedSuccessRate)
                    ),
                    Effect.flatMap(success => {
                        if (success) {
                            // Simulate successful completion
                            const result = { data: `Task A completed at ${new Date().toISOString()}` }
                            const successEvent: AgentRecord = {
                                id: crypto.randomUUID(),
                                agentRuntimeId: id,
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
                                Effect.tap(event => AgentRuntimeService.send(id, event)),
                                Effect.map(() => ({
                                    ...state,
                                    status: TaskAStatus.COMPLETED,
                                    completedAt: Date.now(),
                                    result,
                                    error: undefined
                                }))
                            )
                        } else {
                            // Simulate failure
                            const error = new Error("Task A simulated failure")
                            const failureEvent: AgentRecord = {
                                id: crypto.randomUUID(),
                                agentRuntimeId: id,
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
                                Effect.tap(event => AgentRuntimeService.send(id, event)),
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

    // Create and return the agent runtime instance
    return pipe(
        AgentRuntimeService,
        Effect.flatMap(service => service.create(id, initialState))
    )
}