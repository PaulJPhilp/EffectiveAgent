import { RepositoryError } from "./repository-error.js"

/**
 * Error indicating that provided data failed validation checks.
 */
export class DataValidationError extends RepositoryError {
    // Optionally store validation issues (e.g., from Zod)
    public readonly validationIssues?: unknown[]

    constructor(
        message: string,
        options?: ErrorOptions & { readonly validationIssues?: unknown[] }
    ) {
        super(message, options)
        this.name = "DataValidationError"
        this.validationIssues = options?.validationIssues
    }
} 