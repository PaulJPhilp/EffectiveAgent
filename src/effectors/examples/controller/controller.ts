import { Effect, Stream, pipe } from "effect"
import type { Effector, EffectorServiceApi } from "../../effector/api.js"
import { EffectorError } from "../../effector/errors.js"
import { EffectorService } from "../../effector/service.js"
import type { AgentRecord, EffectorId } from "../../effector/types.js"
import { AgentRecordType, makeEffectorId } from "../../effector/types.js"
import { createCounterEffector } from "../counter/counter.js"

/**
 * Commands that can be sent to the ControllerEffector
 */
export const ControllerCommand = {
    CREATE_COUNTER: "CREATE_COUNTER",
    TERMINATE_COUNTER: "TERMINATE_COUNTER",
    BROADCAST_COMMAND: "BROADCAST_COMMAND"
} as const

export type ControllerCommand = typeof ControllerCommand[keyof typeof ControllerCommand]

/**
 * State managed by the ControllerEffector
 */
export interface ControllerState {
    readonly managedEffectors: EffectorId[]
    readonly lastOperation?: ControllerCommand
    readonly lastUpdated: number
}

/**
 * Creates a new ControllerEffector instance
 */
export const createControllerEffector = (
    id: EffectorId
): Effect.Effect<Effector<ControllerState>, EffectorError, EffectorServiceApi> =>
    Effect.gen(function* () {
        // Get the EffectorService
        const service = yield* EffectorService

        // Create the effector with initial state and processing logic
        const effector = yield* service.create<ControllerState>(
            id,
            {
                managedEffectors: [],
                lastUpdated: Date.now()
            }
        )

        // Set up message processing
        yield* pipe(
            effector.subscribe(),
            Stream.runForEach(record => processRecord(effector, record)),
            Effect.fork
        )

        return effector
    })

/**
 * Processes incoming records for the ControllerEffector
 */
const processRecord = (
    effector: Effector<ControllerState>,
    record: AgentRecord
): Effect.Effect<void, Error | EffectorError, EffectorServiceApi> =>
    Effect.gen(function* () {
        if (record.type !== AgentRecordType.COMMAND) return

        const service = yield* EffectorService
        const currentState = yield* effector.getState()
        const command = record.payload as { type: ControllerCommand; data?: unknown }

        switch (command.type) {
            case ControllerCommand.CREATE_COUNTER: {
                // Create a new counter
                const counterId = makeEffectorId(`counter-${currentState.state.managedEffectors.length + 1}`)
                const counter = yield* createCounterEffector(counterId)

                // Update state and notify subscribers
                yield* service.send(effector.id, {
                    id: crypto.randomUUID(),
                    effectorId: effector.id,
                    timestamp: Date.now(),
                    type: AgentRecordType.STATE_CHANGE,
                    payload: {
                        ...currentState.state,
                        managedEffectors: [...currentState.state.managedEffectors, counterId],
                        lastOperation: command.type,
                        lastUpdated: Date.now()
                    },
                    metadata: {
                        operation: command.type,
                        counterId
                    }
                })

                // Notify about counter creation
                yield* effector.send({
                    id: crypto.randomUUID(),
                    effectorId: effector.id,
                    timestamp: Date.now(),
                    type: AgentRecordType.STATE_CHANGE,
                    payload: { counterId },
                    metadata: {
                        operation: command.type
                    }
                })
                break
            }

            case ControllerCommand.TERMINATE_COUNTER: {
                const counterId = command.data as EffectorId
                if (currentState.state.managedEffectors.includes(counterId)) {
                    // Terminate the counter
                    yield* service.terminate(counterId)

                    // Update state and emit event
                    yield* service.send(effector.id, {
                        id: crypto.randomUUID(),
                        effectorId: effector.id,
                        timestamp: Date.now(),
                        type: AgentRecordType.STATE_CHANGE,
                        payload: {
                            ...currentState.state,
                            managedEffectors: currentState.state.managedEffectors.filter(id => id !== counterId),
                            lastOperation: command.type,
                            lastUpdated: Date.now()
                        },
                        metadata: {
                            operation: command.type,
                            terminatedId: counterId
                        }
                    })
                }
                break
            }

            case ControllerCommand.BROADCAST_COMMAND: {
                // Broadcast command to all managed counters
                yield* Effect.forEach(
                    currentState.state.managedEffectors,
                    counterId =>
                        service.send(counterId, {
                            id: crypto.randomUUID(),
                            effectorId: counterId,
                            timestamp: Date.now(),
                            type: AgentRecordType.COMMAND,
                            payload: command.data,
                            metadata: {
                                sourceEffectorId: effector.id
                            }
                        }),
                    { concurrency: "unbounded" }
                )

                // Update state and emit event
                yield* service.send(effector.id, {
                    id: crypto.randomUUID(),
                    effectorId: effector.id,
                    timestamp: Date.now(),
                    type: AgentRecordType.STATE_CHANGE,
                    payload: {
                        ...currentState.state,
                        lastOperation: command.type,
                        lastUpdated: Date.now()
                    },
                    metadata: {
                        operation: command.type,
                        broadcastCommand: command.data
                    }
                })
                break
            }
        }
    }) 