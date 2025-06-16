import { EffectiveError } from "@/errors.js"

/**
 * Error thrown when EA SDK validation fails.
 * Used for invalid agent state, configuration, or parameters.
 */
export class EASdkValidationError extends EffectiveError {
    readonly validationErrors?: ReadonlyArray<string>

    constructor(params: {
        message: string
        module: string
        method: string
        validationErrors?: ReadonlyArray<string>
        cause?: unknown
    }) {
        super({
            description: params.message,
            module: params.module,
            method: params.method,
            cause: params.cause
        })
        this.validationErrors = params.validationErrors
    }
}

/**
 * Error thrown when SDK configuration is invalid or missing.
 * Used for configuration-related issues in the EA SDK.
 */
export class EASdkConfigurationError extends EffectiveError {
    readonly configKey?: string
    readonly expectedType?: string

    constructor(params: {
        message: string
        module: string
        method: string
        configKey?: string
        expectedType?: string
        cause?: unknown
    }) {
        super({
            description: params.message,
            module: params.module,
            method: params.method,
            cause: params.cause
        })
        this.configKey = params.configKey
        this.expectedType = params.expectedType
    }
}

/**
 * Error thrown when LangGraph agent creation fails.
 * Used for issues specific to creating or initializing LangGraph agents.
 */
export class EASdkAgentCreationError extends EffectiveError {
    readonly agentType?: string
    readonly creationStep?: string

    constructor(params: {
        message: string
        module: string
        method: string
        agentType?: string
        creationStep?: string
        cause?: unknown
    }) {
        super({
            description: params.message,
            module: params.module,
            method: params.method,
            cause: params.cause
        })
        this.agentType = params.agentType
        this.creationStep = params.creationStep
    }
}

/**
 * Error thrown when LangGraph operations fail during execution.
 * Used for runtime errors during LangGraph agent operations.
 */
export class EASdkOperationError extends EffectiveError {
    readonly operation?: string
    readonly agentId?: string

    constructor(params: {
        message: string
        module: string
        method: string
        operation?: string
        agentId?: string
        cause?: unknown
    }) {
        super({
            description: params.message,
            module: params.module,
            method: params.method,
            cause: params.cause
        })
        this.operation = params.operation
        this.agentId = params.agentId
    }
}

/**
 * Error thrown when there are compatibility issues between EA and LangGraph.
 * Used for version mismatches or interface incompatibilities.
 */
export class EASdkCompatibilityError extends EffectiveError {
    readonly requiredVersion?: string
    readonly currentVersion?: string
    readonly component?: string

    constructor(params: {
        message: string
        module: string
        method: string
        requiredVersion?: string
        currentVersion?: string
        component?: string
        cause?: unknown
    }) {
        super({
            description: params.message,
            module: params.module,
            method: params.method,
            cause: params.cause
        })
        this.requiredVersion = params.requiredVersion
        this.currentVersion = params.currentVersion
        this.component = params.component
    }
} 