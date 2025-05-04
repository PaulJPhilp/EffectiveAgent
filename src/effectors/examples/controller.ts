import { Effect, pipe } from "effect"
import type { Effector } from "../effector/api.js"
import { EffectorService } from "../effector/service.js"
import type { AgentRecord, EffectorId } from "../effector/types.js"
import { AgentRecordType, makeEffectorId } from "../effector/types.js"
import { createCounterEffector } from "./counter.js"

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
): Effect.Effect<Effector<ControllerState>> =>
    Effect.gen(function* () {
        // Get the EffectorService
        const service = yield* EffectorService

        // Create the effector with initial state
        const effector = yield* service.create<ControllerState>(id, {
            managedEffectors: [],
            lastUpdated: Date.now()
        })

        // Set up message processing
        yield* pipe(
            effector.subscribe(),
            Effect.flatMap(stream =>
                stream.pipe(Effect.forEach(record => processRecord(effector, record)))
            ),
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
): Effect.Effect<void> =>
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

                // Update state
                yield* Effect.sync(() => {
                    currentState.state.managedEffectors.push(counterId)
                    currentState.state.lastOperation = command.type
                    currentState.state.lastUpdated = Date.now()
                })

                // Emit state change event
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

                    // Update state
                    yield* Effect.sync(() => {
                        currentState.state.managedEffectors = currentState.state.managedEffectors.filter(
                            id => id !== counterId
                        )
                        currentState.state.lastOperation = command.type
                        currentState.state.lastUpdated = Date.now()
                    })

                    // Emit state change event
                    yield* effector.send({
                        id: crypto.randomUUID(),
                        effectorId: effector.id,
                        timestamp: Date.now(),
                        type: AgentRecordType.STATE_CHANGE,
                        payload: { terminatedId: counterId },
                        metadata: {
                            operation: command.type
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

                // Update state
                yield* Effect.sync(() => {
                    currentState.state.lastOperation = command.type
                    currentState.state.lastUpdated = Date.now()
                })

                // Emit state change event
                yield* effector.send({
                    id: crypto.randomUUID(),
                    effectorId: effector.id,
                    timestamp: Date.now(),
                    type: AgentRecordType.STATE_CHANGE,
                    payload: { broadcastCommand: command.data },
                    metadata: {
                        operation: command.type
                    }
                })
                break
            }
        }
    }) 