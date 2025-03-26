/**
 * Base error class for prompt-related errors
 */
export class PromptError extends Error {
    readonly code: string
    readonly templateName?: string
    readonly variableName?: string

    constructor(
        message: string,
        code: string,
        details?: {
            templateName?: string
            variableName?: string
        }
    ) {
        super(message)
        this.name = 'PromptError'
        this.code = code
        this.templateName = details?.templateName
        this.variableName = details?.variableName
    }
}

/**
 * Error thrown when the PromptService fails to initialize
 */
export class PromptServiceError extends PromptError {
    readonly originalError?: Error

    constructor(message: string, originalError?: Error) {
        super(
            `Failed to initialize PromptService: ${message}`,
            'PROMPT_SERVICE_INITIALIZATION_ERROR'
        )
        this.name = 'PromptServiceError'
        this.originalError = originalError
    }
}

/**
 * Error thrown when a prompt template is not found
 */
export class PromptNotFoundError extends PromptError {
    constructor(templateName: string) {
        super(
            `Prompt template not found: ${templateName}`,
            'PROMPT_NOT_FOUND',
            { templateName }
        )
        this.name = 'PromptNotFoundError'
    }
}

/**
 * Error thrown when required variables are missing from a prompt
 */
export class PromptVariableMissingError extends PromptError {
    readonly missingVariables: string[]

    constructor(templateName: string, missingVariables: string[]) {
        super(
            `Missing required variables for template "${templateName}": ${missingVariables.join(', ')}`,
            'PROMPT_VARIABLE_MISSING',
            { templateName }
        )
        this.name = 'PromptVariableMissingError'
        this.missingVariables = missingVariables
    }
}

/**
 * Error thrown when a prompt rendering fails
 */
export class PromptRenderingError extends PromptError {
    readonly originalError?: Error

    constructor(templateName: string, originalError?: Error) {
        super(
            `Failed to render prompt template "${templateName}": ${originalError?.message || 'Unknown error'}`,
            'PROMPT_RENDERING_ERROR',
            { templateName }
        )
        this.name = 'PromptRenderingError'
        this.originalError = originalError
    }
} 