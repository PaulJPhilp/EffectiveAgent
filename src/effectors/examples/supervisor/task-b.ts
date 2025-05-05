import { Effect, pipe } from "effect"
import type { Effector } from "../../effector/api.js"
import { EffectorService } from "../../effector/service.js"
import type { AgentRecord, EffectorId } from "../../effector/types.js"
import { AgentRecordType } from "../../effector/types.js"

/**
 * Commands that can be sent to TaskEffectorB
 */
export const TaskBCommand = {
    START_TASK: "START_TASK"
} as const

export type TaskBCommand = typeof TaskBCommand[keyof typeof TaskBCommand]

/**
 * Events emitted by TaskEffectorB
 */
export const TaskBEventType = {
    TASK_STARTED: "TASK_STARTED",
    PROCESSING_STEP_COMPLETED: "PROCESSING_STEP_COMPLETED",
    TASK_COMPLETED: "TASK_COMPLETED",
    TASK_FAILED: "TASK_FAILED"
} as const

export type TaskBEventType = typeof TaskBEventType[keyof typeof TaskBEventType]

/**
 * Status of the task
 */
export const TaskBStatus = {
    IDLE: "IDLE",
    PROCESSING: "PROCESSING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED"
} as const

export type TaskBStatus = typeof TaskBStatus[keyof typeof TaskBStatus]

/**
 * State for tracking a processing step
 */
export interface ProcessingStep {
    status: "completed" | "failed"
    startedAt: number
    completedAt: number
    error?: string
}

/**
 * State maintained by TaskEffectorB
 */
export interface TaskBState {
    status: TaskBStatus
    currentStep: number
    totalSteps: number
    steps: Record<number, ProcessingStep>
    startedAt?: number
    completedAt?: number
    error?: unknown
}

interface TaskBConfig {
    totalSteps: number
    stepDelayMs: number
    failureProbability: number
}

const defaultConfig: TaskBConfig = {
    totalSteps: 3,
    stepDelayMs: 500,
    failureProbability: 0.1
}

/**
 * Creates a new TaskEffectorB instance
 */
export const createTaskEffectorB = (
    id: EffectorId,
    config: Partial<TaskBConfig> = {}
): Effect.Effect<Effector<TaskBState>> => {
    const finalConfig = { ...defaultConfig, ...config }

    // Initial state
    const initialState: TaskBState = {
        status: TaskBStatus.IDLE,
        currentStep: 0,
        totalSteps: finalConfig.totalSteps,
        steps: {}
    }

    // Helper to process a single step
    const processStep = (state: TaskBState): Effect.Effect<TaskBState, Error> =>
        Effect.gen(function* () {
            // Check for simulated failure
            if (Math.random() < finalConfig.failureProbability) {
                const error = new Error(`Step ${state.currentStep} failed`)
                return {
                    ...state,
                    status: TaskBStatus.FAILED,
                    steps: {
                        ...state.steps,
                        [state.currentStep]: {
                            status: "failed",
                            startedAt: Date.now(),
                            completedAt: Date.now(),
                            error: error.message
                        }
                    },
                    error
                }
            }

            // Simulate step processing
            yield* Effect.sleep(finalConfig.stepDelayMs)

            const now = Date.now()
            const nextStep = state.currentStep + 1
            const isComplete = nextStep > state.totalSteps

            // Update state
            return {
                ...state,
                status: isComplete ? TaskBStatus.COMPLETED : TaskBStatus.PROCESSING,
                currentStep: nextStep,
                completedAt: isComplete ? now : undefined,
                steps: {
                    ...state.steps,
                    [state.currentStep]: {
                        status: "completed",
                        startedAt: now - finalConfig.stepDelayMs,
                        completedAt: now
                    }
                }
            }
        })

    // Processing logic
    const processingLogic = (record: AgentRecord, state: TaskBState) => {
        if (record.type !== AgentRecordType.COMMAND ||
            (state.status !== TaskBStatus.IDLE && record.payload.type === TaskBCommand.START_TASK)) {
            return Effect.succeed(state)
        }

        const command = record.payload as { type: TaskBCommand }

        switch (command.type) {
            case TaskBCommand.START_TASK: {
                // Emit TASK_STARTED event
                const startEvent: AgentRecord = {
                    id: crypto.randomUUID(),
                    effectorId: id,
                    timestamp: Date.now(),
                    type: AgentRecordType.EVENT,
                    payload: {
                        type: TaskBEventType.TASK_STARTED,
                        config: finalConfig
                    },
                    metadata: {}
                }

                // Start processing steps
                return pipe(
                    // First emit start event
                    Effect.sync(() => startEvent),
                    Effect.tap(event => EffectorService.send(id, event)),

                    // Initialize processing state
                    Effect.map(() => ({
                        ...state,
                        status: TaskBStatus.PROCESSING,
                        currentStep: 1,
                        startedAt: Date.now()
                    })),

                    // Process first step
                    Effect.flatMap(newState => processStep(newState)),

                    // Handle step result
                    Effect.flatMap(stepState => {
                        // Check if failed
                        if (stepState.status === TaskBStatus.FAILED) {
                            const failureEvent: AgentRecord = {
                                id: crypto.randomUUID(),
                                effectorId: id,
                                timestamp: Date.now(),
                                type: AgentRecordType.EVENT,
                                payload: {
                                    type: TaskBEventType.TASK_FAILED,
                                    error: stepState.error
                                },
                                metadata: {}
                            }

                            return pipe(
                                Effect.sync(() => failureEvent),
                                Effect.tap(event => EffectorService.send(id, event)),
                                Effect.map(() => stepState)
                            )
                        }

                        // Emit step completed event
                        const stepEvent: AgentRecord = {
                            id: crypto.randomUUID(),
                            effectorId: id,
                            timestamp: Date.now(),
                            type: AgentRecordType.EVENT,
                            payload: {
                                type: TaskBEventType.PROCESSING_STEP_COMPLETED,
                                step: stepState.currentStep - 1,
                                totalSteps: stepState.totalSteps
                            },
                            metadata: {}
                        }

                        // Check if all steps complete
                        if (stepState.status === TaskBStatus.COMPLETED) {
                            const completedEvent: AgentRecord = {
                                id: crypto.randomUUID(),
                                effectorId: id,
                                timestamp: Date.now(),
                                type: AgentRecordType.EVENT,
                                payload: {
                                    type: TaskBEventType.TASK_COMPLETED
                                },
                                metadata: {}
                            }

                            return pipe(
                                Effect.sync(() => [stepEvent, completedEvent]),
                                Effect.tap(events =>
                                    Effect.forEach(
                                        events,
                                        event => EffectorService.send(id, event),
                                        { concurrency: "unbounded" }
                                    )
                                ),
                                Effect.map(() => stepState)
                            )
                        }

                        // Continue processing next step
                        return pipe(
                            Effect.sync(() => stepEvent),
                            Effect.tap(event => EffectorService.send(id, event)),
                            Effect.map(() => stepState),
                            Effect.flatMap(state => processStep(state)),
                            Effect.flatMap(newState => processingLogic(record, newState))
                        )
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