import { Effect, Stream, pipe } from "effect"
import type { Effector, EffectorServiceApi } from "../../effector/api.js"
import { EffectorError } from "../../effector/errors.js"
import { EffectorService } from "../../effector/service.js"
import type { EffectorId } from "../../effector/types.js"
import { AgentRecordType } from "../../effector/types.js"

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
): Effect.Effect<Effector<CounterState>, EffectorError, EffectorServiceApi> =>
    Effect.gen(function* () {
        // Get the EffectorService
        const service = yield* EffectorService

        // Create the effector with initial state
        const effector = yield* service.create<CounterState>(
            id,
            {
                count: initialCount,
                lastUpdated: Date.now()
            }
        )

        // Set up command processing
        const processingFiber = yield* pipe(
            effector.subscribe(),
            Stream.filter(record => record.type === AgentRecordType.COMMAND),
            Stream.runForEach(record =>
                Effect.gen(function* () {
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

                    // Create new state
                    const newState = {
                        count: newCount,
                        lastOperation: command.type,
                        lastUpdated: Date.now()
                    }

                    // Send state change
                    yield* service.send(id, {
                        id: crypto.randomUUID(),
                        effectorId: id,
                        timestamp: Date.now(),
                        type: AgentRecordType.STATE_CHANGE,
                        payload: newState,
                        metadata: {
                            operation: command.type
                        }
                    })

                    // Verify state update
                    const updatedState = yield* effector.getState()
                    if (updatedState.state.count !== newCount) {
                        throw new Error(`Failed to update state: expected ${newCount}, got ${updatedState.state.count}`)
                    }
                })
            ),
            Effect.fork
        )

        // Wait for processing to be ready
        yield* Effect.sleep(100)

        return effector
    }) 