import {
    AgentRecord,
    AgentRecordType,
    AgentRuntime,
    AgentRuntimeId,
    AgentRuntimeService
} from "@/agent-runtime/index.js"
import { Effect, pipe } from "effect"

/**
 * Commands that can be sent to TaskRuntimeB
 */
export const TaskBCommand = {
    START_TASK: "START_TASK"
} as const

export type TaskBCommand = typeof TaskBCommand[keyof typeof TaskBCommand]

/**
 * Events emitted by TaskRuntimeB
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
    id: number
    startedAt: number
    completedAt?: number
    error?: Error
}

/**
 * State maintained by TaskRuntimeB
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
 * Creates a new TaskRuntimeB instance
 */
export const createTaskRuntimeB = (
    id: AgentRuntimeId,
    config: Partial<TaskBConfig> = {}
): Effect.Effect<AgentRuntime<TaskBState>> => {
    const finalConfig = { ...defaultConfig, ...config }

    // Initial state
    const initialState: TaskBState = {
        status: TaskBStatus.IDLE,
        currentStep: 0,
        totalSteps: finalConfig.totalSteps,
        steps: {}
    }

    // Helper to process a single step
    const processStep = (state: TaskBState): Effect.Effect<TaskBState> =>
        Effect.gen(function* () {
            const stepNumber = state.currentStep + 1
            const step: ProcessingStep = {
                id: stepNumber,
                startedAt: Date.now()
            }

            // Check for simulated failure
            if (Math.random() < finalConfig.failureProbability) {
                const error = new Error(`Step ${stepNumber} failed`)
                return {
                    ...state,
                    status: TaskBStatus.FAILED,
                    steps: {
                        ...state.steps,
                        [stepNumber]: {
                            ...step,
                            completedAt: Date.now(),
                            error
                        }
                    },
                    error,
                    completedAt: Date.now()
                }
            }

            // Simulate step processing
            yield* Effect.sleep(finalConfig.stepDelayMs)

            // Update state with completed step
            const completedStep = {
                ...step,
                completedAt: Date.now()
            }

            return {
                ...state,
                currentStep: stepNumber,
                steps: {
                    ...state.steps,
                    [stepNumber]: completedStep
                },
                ...(stepNumber === state.totalSteps
                    ? {
                        status: TaskBStatus.COMPLETED,
                        completedAt: Date.now()
                    }
                    : {})
            }
        })

    // Processing logic
    const workflow = (record: AgentRecord, state: TaskBState) => {
        if (record.type !== AgentRecordType.COMMAND ||
            (state.status !== TaskBStatus.IDLE && record.payload.type === TaskBCommand.START_TASK)) {
            return Effect.succeed(state)
        }

        const command = record.payload as { type: TaskBCommand }

        switch (command.type) {
            case TaskBCommand.START_TASK: {
                // Start processing
                const startState: TaskBState = {
                    ...state,
                    status: TaskBStatus.PROCESSING,
                    currentStep: 0,
                    startedAt: Date.now()
                }

                // Emit started event
                const startEvent: AgentRecord = {
                    id: crypto.randomUUID(),
                    agentRuntimeId: id,
                    timestamp: Date.now(),
                    type: AgentRecordType.EVENT,
                    payload: {
                        type: TaskBEventType.TASK_STARTED
                    },
                    metadata: {}
                }

                // Process all steps
                return pipe(
                    Effect.gen(function* () {
                        const agentRuntimeService = yield* AgentRuntimeService
                        yield* agentRuntimeService.send(id, startEvent)

                        let stepState = startState
                        for (let step = 1; step <= finalConfig.totalSteps; step++) {
                            // Process step
                            stepState = yield* processStep(stepState)

                            // Check for failure
                            if (stepState.status === TaskBStatus.FAILED) {
                                const failureEvent: AgentRecord = {
                                    id: crypto.randomUUID(),
                                    agentRuntimeId: id,
                                    timestamp: Date.now(),
                                    type: AgentRecordType.EVENT,
                                    payload: {
                                        type: TaskBEventType.TASK_FAILED,
                                        error: stepState.error
                                    },
                                    metadata: {}
                                }

                                // Send failure event and stop processing
                                yield* pipe(
                                    Effect.succeed(failureEvent),
                                    Effect.tap(event => agentRuntimeService.send(id, event))
                                )

                                return stepState
                            }

                            // Emit step completion event
                            const stepEvent: AgentRecord = {
                                id: crypto.randomUUID(),
                                agentRuntimeId: id,
                                timestamp: Date.now(),
                                type: AgentRecordType.EVENT,
                                payload: {
                                    type: TaskBEventType.PROCESSING_STEP_COMPLETED,
                                    step,
                                    totalSteps: finalConfig.totalSteps
                                },
                                metadata: {}
                            }

                            // If this is the last step, also emit completion event
                            if (step === finalConfig.totalSteps) {
                                const completionEvent: AgentRecord = {
                                    id: crypto.randomUUID(),
                                    agentRuntimeId: id,
                                    timestamp: Date.now(),
                                    type: AgentRecordType.EVENT,
                                    payload: {
                                        type: TaskBEventType.TASK_COMPLETED
                                    },
                                    metadata: {}
                                }

                                yield* pipe(
                                    Effect.succeed([stepEvent, completionEvent]),
                                    Effect.tap(events =>
                                        Effect.forEach(
                                            events,
                                            event => agentRuntimeService.send(id, event),
                                            { concurrency: "unbounded" }
                                        )
                                    )
                                )

                                return stepState
                            }

                            // Continue processing next step
                            yield* pipe(
                                Effect.succeed(stepEvent),
                                Effect.tap(event => agentRuntimeService.send(id, event))
                            )
                        }

                        return stepState
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