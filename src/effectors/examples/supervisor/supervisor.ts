import { Effect, Stream, pipe } from "effect"
import type { Effector, EffectorServiceApi } from "../../effector/api.js"
import { EffectorError } from "../../effector/errors.js"
import { EffectorService } from "../../effector/service.js"
import type { AgentRecord, EffectorId } from "../../effector/types.js"
import { AgentRecordType, makeEffectorId } from "../../effector/types.js"
import { TaskACommand, TaskAEventType, createTaskEffectorA } from "./task-a.js"
import { TaskBCommand, TaskBEventType, createTaskEffectorB } from "./task-b.js"
import type { SupervisorState } from "./types.js"
import { SupervisorCommand, SupervisorEventType, SupervisorProcessState } from "./types.js"

/**
 * Creates a new SupervisorEffector instance
 */
export const createSupervisorEffector = (
    id: EffectorId
): Effect.Effect<Effector<SupervisorState>, EffectorError, EffectorServiceApi> =>
    Effect.gen(function* () {
        const service = yield* EffectorService

        // Initial state
        const initialState: SupervisorState = {
            processState: SupervisorProcessState.IDLE
        }

        // Create base effector first
        const baseEffector = yield* service.create(id, initialState)

        // Process records (implements state machine transitions)
        const processRecord = (record: AgentRecord, state: SupervisorState): Effect.Effect<SupervisorState, Error, EffectorServiceApi> =>
            Effect.gen(function* () {
                // Handle commands
                if (record.type === AgentRecordType.COMMAND) {
                    const command = record.payload as { type: SupervisorCommand }

                    switch (command.type) {
                        case SupervisorCommand.START_PROCESS: {
                            // Only start if IDLE
                            if (state.processState !== SupervisorProcessState.IDLE) {
                                return state
                            }

                            // Create TaskEffectorA
                            const taskAId = makeEffectorId(`${id}-task-a`)
                            const taskA = yield* createTaskEffectorA(taskAId)

                            // Subscribe to TaskA events
                            yield* pipe(
                                taskA.subscribe(),
                                Stream.filter(record => record.type === AgentRecordType.EVENT),
                                Stream.forEach(event => baseEffector.send({
                                    ...event,
                                    metadata: { ...event.metadata, sourceEffectorId: taskAId }
                                })),
                                Effect.fork
                            )

                            // Emit PROCESS_STARTED event
                            yield* baseEffector.send({
                                id: crypto.randomUUID(),
                                effectorId: id,
                                timestamp: Date.now(),
                                type: AgentRecordType.EVENT,
                                payload: {
                                    type: SupervisorEventType.PROCESS_STARTED
                                },
                                metadata: {}
                            })

                            // Send START_TASK to TaskA
                            yield* service.send(taskAId, {
                                id: crypto.randomUUID(),
                                effectorId: taskAId,
                                timestamp: Date.now(),
                                type: AgentRecordType.COMMAND,
                                payload: { type: TaskACommand.START_TASK },
                                metadata: {}
                            })

                            // Update state
                            return {
                                ...state,
                                processState: SupervisorProcessState.WAITING_FOR_TASK_A,
                                taskAId,
                                startedAt: Date.now(),
                                lastCommand: command.type
                            }
                        }

                        case SupervisorCommand.ABORT_PROCESS: {
                            // Can only abort if in progress
                            if (state.processState === SupervisorProcessState.IDLE ||
                                state.processState === SupervisorProcessState.COMPLETED ||
                                state.processState === SupervisorProcessState.FAILED) {
                                return state
                            }

                            // Terminate task effectors if they exist
                            if (state.taskAId) {
                                yield* service.terminate(state.taskAId)
                            }
                            if (state.taskBId) {
                                yield* service.terminate(state.taskBId)
                            }

                            // Update state
                            return {
                                ...state,
                                processState: SupervisorProcessState.FAILED,
                                error: new Error("Process aborted"),
                                completedAt: Date.now(),
                                lastCommand: command.type
                            }
                        }

                        default:
                            return state
                    }
                }

                // Handle events from task effectors
                if (record.type === AgentRecordType.EVENT) {
                    const event = record.payload as { type: TaskAEventType | TaskBEventType }
                    const sourceId = record.metadata.sourceEffectorId as EffectorId

                    // Events from TaskA
                    if (sourceId === state.taskAId) {
                        switch (event.type) {
                            case TaskAEventType.TASK_COMPLETED: {
                                // Create and start TaskB
                                const taskBId = makeEffectorId(`${id}-task-b`)
                                const taskB = yield* createTaskEffectorB(taskBId)

                                // Subscribe to TaskB events
                                yield* pipe(
                                    taskB.subscribe(),
                                    Stream.filter(record => record.type === AgentRecordType.EVENT),
                                    Stream.forEach(event => baseEffector.send({
                                        ...event,
                                        metadata: { ...event.metadata, sourceEffectorId: taskBId }
                                    })),
                                    Effect.fork
                                )

                                // Send START_TASK to TaskB
                                yield* service.send(taskBId, {
                                    id: crypto.randomUUID(),
                                    effectorId: taskBId,
                                    timestamp: Date.now(),
                                    type: AgentRecordType.COMMAND,
                                    payload: { type: TaskBCommand.START_TASK },
                                    metadata: {}
                                })

                                // Update state
                                return {
                                    ...state,
                                    processState: SupervisorProcessState.WAITING_FOR_TASK_B,
                                    taskBId
                                }
                            }

                            case TaskAEventType.TASK_FAILED: {
                                // Emit process failed event
                                yield* baseEffector.send({
                                    id: crypto.randomUUID(),
                                    effectorId: id,
                                    timestamp: Date.now(),
                                    type: AgentRecordType.EVENT,
                                    payload: {
                                        type: SupervisorEventType.PROCESS_FAILED,
                                        error: event.error || "Task A failed"
                                    },
                                    metadata: {}
                                })

                                // Update state
                                return {
                                    ...state,
                                    processState: SupervisorProcessState.FAILED,
                                    error: event.error || "Task A failed",
                                    completedAt: Date.now()
                                }
                            }

                            default:
                                return state
                        }
                    }

                    // Events from TaskB
                    if (sourceId === state.taskBId) {
                        switch (event.type) {
                            case TaskBEventType.TASK_COMPLETED: {
                                // Emit process completed event
                                yield* baseEffector.send({
                                    id: crypto.randomUUID(),
                                    effectorId: id,
                                    timestamp: Date.now(),
                                    type: AgentRecordType.EVENT,
                                    payload: {
                                        type: SupervisorEventType.PROCESS_COMPLETED
                                    },
                                    metadata: {}
                                })

                                // Update state
                                return {
                                    ...state,
                                    processState: SupervisorProcessState.COMPLETED,
                                    completedAt: Date.now()
                                }
                            }

                            case TaskBEventType.TASK_FAILED: {
                                // Emit process failed event
                                yield* baseEffector.send({
                                    id: crypto.randomUUID(),
                                    effectorId: id,
                                    timestamp: Date.now(),
                                    type: AgentRecordType.EVENT,
                                    payload: {
                                        type: SupervisorEventType.PROCESS_FAILED,
                                        error: event.error || "Task B failed"
                                    },
                                    metadata: {}
                                })

                                // Update state
                                return {
                                    ...state,
                                    processState: SupervisorProcessState.FAILED,
                                    error: event.error || "Task B failed",
                                    completedAt: Date.now()
                                }
                            }

                            default:
                                return state
                        }
                    }
                }

                return state
            })

        // Set up message processing
        yield* pipe(
            baseEffector.subscribe(),
            Stream.runForEach(record =>
                pipe(
                    baseEffector.getState(),
                    Effect.flatMap(state => processRecord(record, state.state)),
                    Effect.flatMap(newState =>
                        baseEffector.send({
                            id: crypto.randomUUID(),
                            effectorId: id,
                            timestamp: Date.now(),
                            type: AgentRecordType.STATE_CHANGE,
                            payload: newState,
                            metadata: {
                                sourceRecord: record.id
                            }
                        })
                    )
                )
            ),
            Effect.fork
        )

        return baseEffector
    })