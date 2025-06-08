import { Effect } from "effect"

export interface ValidationError {
    readonly message: string
    readonly field: string
}

export const validateRequired = (value: string | undefined, field: string): Effect.Effect<void, ValidationError> =>
    value
        ? Effect.succeed(undefined)
        : Effect.fail({ message: `${field} is required`, field })

export const validatePattern = (value: string, pattern: RegExp, field: string): Effect.Effect<void, ValidationError> =>
    pattern.test(value)
        ? Effect.succeed(undefined)
        : Effect.fail({ message: `${field} has invalid format`, field })

export const validateLength = (value: string, min: number, max: number, field: string): Effect.Effect<void, ValidationError> =>
    value.length >= min && value.length <= max
        ? Effect.succeed(undefined)
        : Effect.fail({ message: `${field} must be between ${min} and ${max} characters`, field }) 