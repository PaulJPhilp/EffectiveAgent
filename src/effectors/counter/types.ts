import { Data } from "effect"

/**
 * Commands that can be sent to a CounterEffector
 */
export type CounterCommand = 
    | CounterCommand.Increment
    | CounterCommand.Decrement
    | CounterCommand.Reset
    | CounterCommand.Add

export namespace CounterCommand {
    export class Increment extends Data.TaggedClass("Increment")<{}> {}
    export class Decrement extends Data.TaggedClass("Decrement")<{}> {}
    export class Reset extends Data.TaggedClass("Reset")<{}> {}
    export class Add extends Data.TaggedClass("Add")<{
        readonly amount: number
    }> {}
}

/**
 * State of a CounterEffector
 */
export interface CounterState {
    readonly value: number
    readonly history: ReadonlyArray<{
        readonly command: CounterCommand
        readonly timestamp: number
        readonly previousValue: number
        readonly newValue: number
    }>
}
