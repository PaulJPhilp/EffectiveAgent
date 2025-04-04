import { RepositoryError } from "./repository-error.js"

/**
 * Error indicating that a requested entity could not be found.
 */
export class EntityNotFoundError extends RepositoryError {
    public readonly entityId?: string
    public readonly entityType?: string

    constructor(
        message: string,
        options?: ErrorOptions & { readonly entityId?: string, readonly entityType?: string }
    ) {
        super(message, options)
        this.name = "EntityNotFoundError"
        this.entityId = options?.entityId
        this.entityType = options?.entityType
    }
} 