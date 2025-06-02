import { Data } from "effect"

export class CounterError extends Data.TaggedError("CounterError")<{
    readonly message: string
    readonly cause?: unknown
}> { }

export class InvalidAmountError extends Data.TaggedError("InvalidAmountError")<{
    readonly message: string
    readonly invalidAmount: number
}> { }

export class NegativeValueError extends Data.TaggedError("NegativeValueError")<{
    readonly message: string
    readonly currentValue: number
    readonly decrementAmount: number
}> { } 