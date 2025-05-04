import { Effect, pipe } from "effect"
import type { Effector } from "../effector/api.js"
import { EffectorService } from "../effector/service.js"
import type { AgentRecord, EffectorId } from "../effector/types.js"
import { AgentRecordType } from "../effector/types.js"

/**
 * Commands that can be sent to the CounterEffector
 */
export const CounterCommand = {
    INCREMENT: "INCREMENT",
    DECREMENT: "DECREMENT",
    RESET: "RESET"
} as const

export type CounterCommand = typeof CounterCommand[keyof typeof CounterCommand]

/**
 * State managed by the CounterEffector
 */
export interface CounterState {
    readonly count: number
    readonly lastOperation?: CounterCommand
    readonly lastUpdated: number
}

/**
 * Creates a new CounterEffector instance
 */
export const createCounterEffector = (
    id: EffectorId,
    initialCount = 0
): Effect.Effect<Effector<CounterState>> =>
    Effect.gen(function* () {
        // Get the EffectorService
        const service = yield* EffectorService

        // Create the effector with initial state
        const effector = yield* service.create<CounterState>(id, {
            count: initialCount,
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
 * Processes incoming records for the CounterEffector
 */
const processRecord = (
    effector: Effector<CounterState>,
    record: AgentRecord
): Effect.Effect<void> =>
    Effect.gen(function* () {
        if (record.type !== AgentRecordType.COMMAND) return

        const command = record.payload as { type: CounterCommand }
        const currentState = yield* effector.getState()

        // Process the command
        const newCount = (() => {
            switch (command.type) {
                case CounterCommand.INCREMENT:
                    return currentState.state.count + 1
                case CounterCommand.DECREMENT:
                    return currentState.state.count - 1
                case CounterCommand.RESET:
                    return 0
                default:
                    return currentState.state.count
            }
        })()

        // Update state
        yield* Effect.sync(() => {
            currentState.state.count = newCount
            currentState.state.lastOperation = command.type
            currentState.state.lastUpdated = Date.now()
        })

        // Emit state change event
        yield* effector.send({
            id: crypto.randomUUID(),
            effectorId: effector.id,
            timestamp: Date.now(),
            type: AgentRecordType.STATE_CHANGE,
            payload: { count: newCount },
            metadata: {
                operation: command.type
            }
        })
    }) 