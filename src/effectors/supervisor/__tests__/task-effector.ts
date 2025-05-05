import {
    AgentRecord,
    AgentRecordType,
    AgentRuntime,
    AgentRuntimeId,
    AgentRuntimeService,
    makeAgentRuntimeId
} from "@/agent-runtime/index.js"
import { Effect } from "effect"
import { v4 as uuid4 } from "uuid"

// Task agent runtime types
export const TaskCommand = {
    START_TASK: "START_TASK",
} as const

export type TaskCommand = typeof TaskCommand[keyof typeof TaskCommand]

export interface TaskState {
    isRunning: boolean
    error?: Error
    startedAt?: number
    completedAt?: number
}

/**
 * Creates a test task agent runtime that can simulate success or failure
 */
export const createTaskRuntime = (
    name: string,
    shouldFail = false,
    delayMs = 100
): Effect.Effect<AgentRuntime<TaskState>> =>
    Effect.gen(function* (_) {
        const agentRuntimeService = yield* AgentRuntimeService

        // Create task agent runtime with processing logic
        const runtime = yield* agentRuntimeService.create<TaskState>(
            makeAgentRuntimeId(`task-${name}`),
            {
                isRunning: false
            }
        )

        // Set up command processing
        yield* pipe(
            runtime.subscribe(),
            Stream.tap(record =>
                Effect.gen(function* () {
                    // Only process command records
                    if (record.type !== AgentRecordType.COMMAND ||
                        record.payload.type !== TaskCommand.START_TASK) {
                        return
                    }

                    // Update state to running
                    const state = {
                        isRunning: true,
                        startedAt: Date.now()
                    }

                    yield* agentRuntimeService.send(runtime.id, {
                        id: uuid4(),
                        agentRuntimeId: runtime.id,
                        timestamp: Date.now(),
                        type: AgentRecordType.STATE_CHANGE,
                        payload: state,
                        metadata: {}
                    })

                    // Simulate processing
                    yield* Effect.sleep(delayMs)

                    // Simulate success/failure
                    const supervisorId = record.metadata.sourceAgentRuntimeId as AgentRuntimeId
                    const correlationId = record.metadata.correlationId as string

                    if (shouldFail) {
                        // Send failure event
                        const failureEvent: AgentRecord = {
                            id: uuid4(),
                            agentRuntimeId: supervisorId,
                            timestamp: Date.now(),
                            type: AgentRecordType.EVENT,
                            payload: {
                                type: `TASK_${name.toUpperCase()}_FAILED`,
                                error: new Error(`Task ${name} failed`)
                            },
                            metadata: { correlationId }
                        }
                        yield* agentRuntimeService.send(supervisorId, failureEvent)

                        return {
                            isRunning: false,
                            error: new Error(`Task ${name} failed`),
                            startedAt: state.startedAt,
                            completedAt: Date.now()
                        }
                    } else {
                        // Send success event
                        const successEvent: AgentRecord = {
                            id: uuid4(),
                            agentRuntimeId: supervisorId,
                            timestamp: Date.now(),
                            type: AgentRecordType.EVENT,
                            payload: {
                                type: `TASK_${name.toUpperCase()}_COMPLETED`
                            },
                            metadata: { correlationId }
                        }
                        yield* agentRuntimeService.send(supervisorId, successEvent)

                        return {
                            isRunning: false,
                            startedAt: state.startedAt,
                            completedAt: Date.now()
                        }
                    }
                })
            ),
            Stream.runDrain,
            Effect.fork
        )

        return runtime
    })