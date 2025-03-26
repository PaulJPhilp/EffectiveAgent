/**
 * Base error class for model service errors
 */
export class ModelServiceError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'ModelServiceError'
    }
}

/**
 * Thrown when object generation fails validation
 */
export class ValidationError extends ModelServiceError {
    constructor(
        message: string,
        public readonly validationErrors: string[],
        public readonly generatedData?: unknown
    ) {
        super(message)
        this.name = 'ValidationError'
    }
}

/**
 * Thrown when model generation fails
 */
export class GenerationError extends ModelServiceError {
    constructor(
        message: string,
        public readonly modelId: string,
        public readonly cause?: Error
    ) {
        super(message)
        this.name = 'GenerationError'
    }
}

/**
 * Thrown when model configuration is invalid
 */
export class ModelConfigError extends ModelServiceError {
    constructor(
        message: string,
        public readonly modelId: string
    ) {
        super(message)
        this.name = 'ModelConfigError'
    }
} 