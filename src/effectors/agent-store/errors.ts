import { EffectiveError } from "../../errors.js"

/**
 * Base error class for AgentStore operations
 */
export class StoreError extends EffectiveError {
    constructor(message: string, options?: ErrorOptions) {
        super({
            description: message,
            module: "agent-store",
            method: "store",
            cause: options?.cause
        })
    }
}

/**
 * Thrown when a record cannot be found in the store
 */
export class RecordNotFoundError extends StoreError {
    constructor(recordId: string, options?: ErrorOptions) {
        super(`Record not found: ${recordId}`, options)
    }
}

/**
 * Thrown when there is an error during database operations
 */
export class DatabaseError extends StoreError {
    constructor(message: string, options?: ErrorOptions) {
        super(`Database error: ${message}`, options)
    }
}

/**
 * Thrown when there is an error during state synchronization
 */
export class SyncError extends StoreError {
    constructor(message: string, options?: ErrorOptions) {
        super(`Sync error: ${message}`, options)
    }
}

/**
 * Thrown when there is an error with the input parameters
 */
export class ValidationError extends StoreError {
    constructor(message: string, options?: ErrorOptions) {
        super(`Validation error: ${message}`, options)
    }
}