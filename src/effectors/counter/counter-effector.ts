import { Effect, pipe } from "effect"
import { makeEffectorId, type AgentRecord, type ProcessingLogic } from "../effector/types.js"
import { CounterCommand, type CounterState } from "./types.js"
import { EffectorInstance } from "../effector/instance.js"
import { EffectorService } from "../effector/service.js"

/**
 * Initial state for a new CounterEffector
 */
const initialState: CounterState = {
    value: 0,
    history: []
}

/**
 * Processing logic for CounterEffector
 */
const processCounterCommand: ProcessingLogic<CounterState, never, never> = (record: AgentRecord, state: CounterState): Effect.Effect<CounterState, never, never> => {
    console.log('Processing record:', record)
    console.log('Current state:', state)

    if (!record.payload || !(record.payload instanceof CounterCommand.Increment || 
        record.payload instanceof CounterCommand.Decrement || 
        record.payload instanceof CounterCommand.Reset || 
        record.payload instanceof CounterCommand.Add)) {
        console.log('Invalid command:', record.payload)
        return Effect.succeed(state)
    }

    const command = record.payload as CounterCommand
    const previousValue = state.value
    let newValue = state.value

    console.log('Processing command:', command)

    if (command instanceof CounterCommand.Increment) {
        newValue = state.value + 1
    } else if (command instanceof CounterCommand.Decrement) {
        newValue = state.value - 1
    } else if (command instanceof CounterCommand.Reset) {
        newValue = 0
    } else if (command instanceof CounterCommand.Add) {
        newValue = state.value + command.amount
    }

    console.log('New value:', newValue)

    const newState = {
        value: newValue,
        history: [
            ...state.history,
            {
                command,
                timestamp: Date.now(),
                previousValue,
                newValue
            }
        ]
    }

    console.log('New state:', newState)
    return Effect.succeed(newState)
}

/**
 * Creates a new CounterEffector instance
 */
export const createCounterEffector = (id: string) => {
    const effectorId = makeEffectorId(id)
    return pipe(
        Effect.succeed(effectorId),
        Effect.tap(effectorId => Effect.log(`Creating counter effector with id ${effectorId}`)),
        Effect.flatMap(effectorId => EffectorInstance.create<CounterState>(
            effectorId,
            initialState,
            processCounterCommand,
            {
                size: 1000,
                enablePrioritization: true,
                priorityQueueSize: 100,
                backpressureTimeout: 5000
            }
        )),
        Effect.tap(instance => Effect.log('Created instance:', instance)),
        Effect.map(instance => ({
            id: effectorId,
            send: instance.send,
            getState: instance.getState,
            subscribe: instance.subscribe
        })),
        Effect.tap(effector => Effect.log('Created effector:', effector)),
        Effect.provide(EffectorService.Default),
        Effect.tap(() => Effect.log('Provided service layer')),
        Effect.flatMap(effector => pipe(
            effector.getState(),
            Effect.map(state => {
                console.log('Initial state:', state)
                return effector
            })
        ))
    )
}
