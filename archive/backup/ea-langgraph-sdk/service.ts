import { Effect } from "effect"
import type { AgentRuntimeServiceApi } from "@/ea-agent-runtime/api.js"
import {
    EASdkCompatibilityError,
    EASdkConfigurationError,
    EASdkValidationError
} from "./errors.js"
import type {
    AgentStateValidationResult,
    CreateLangGraphAgentParams,
    LangGraphActivityPayload,
    LangGraphAgentConfig,
    LangGraphAgentCreationResult,
    LangGraphAgentState
} from "./types.js"

/**
 * Default configuration values for LangGraph agents.
 */
const DEFAULT_LANGGRAPH_CONFIG: Required<LangGraphAgentConfig> = {
    recursionLimit: 50,
    timeoutMs: 30000,
    enableStreaming: false,
    errorHandling: "propagate",
    retryAttempts: 3
}

/**
 * Current EA SDK version for compatibility checking.
 */
const EA_SDK_VERSION = "1.0.0"

/**
 * Supported features for compatibility checking.
 */
const SUPPORTED_FEATURES = ["streaming", "retry", "validation", "enhanced-creation"] as const

/**
 * EA SDK Library - bridges from Effect world to non-Effect LangGraph world
 * 
 * These functions take Effect-based EA services and convert them to plain
 * JavaScript values/promises that LangGraph agents can use directly.
 */

/**
 * Create a LangGraph agent state object with EA runtime integration
 */
async function createLangGraphAgentState<
    TContext extends Record<string, unknown> = Record<string, unknown>,
    TState extends Record<string, unknown> = Record<string, unknown>
>(
    agentRuntime: AgentRuntimeServiceApi,
    context?: TContext,
    additionalState?: TState
): Promise<LangGraphAgentState<TContext> & TState> {
    // Bridge from Effect world to plain object
    const state = {
        agentRuntime,
        ...(context && { context }),
        ...(additionalState || {})
    } as LangGraphAgentState<TContext> & TState

    return state
}

/**
 * Create an enhanced LangGraph agent with EA integration
 */
async function createEnhancedLangGraphAgent<TState extends LangGraphAgentState>(
    agentRuntime: AgentRuntimeServiceApi,
    params: CreateLangGraphAgentParams<TState>
): Promise<LangGraphAgentCreationResult<TState>> {
    // Run Effect-based operations and extract results
    const program = Effect.gen(function* () {

        // Validate the initial state
        const validation = yield* validateAgentStateEffect(params.initialState)
        if (!validation.isValid) {
            return yield* Effect.fail(new EASdkValidationError({
                message: `Invalid LangGraph agent state: ${validation.errors?.join(", ") || "validation failed"}`,
                module: "EASdk",
                method: "createEnhancedLangGraphAgent",
                validationErrors: validation.errors
            }))
        }

        // Validate and normalize configuration
        const normalizedConfig = yield* validateConfigurationEffect(params.config || {})

        // Delegate to AgentRuntimeService
        const result = yield* agentRuntime.createLangGraphAgent(
            params.compiledGraph,
            params.initialState,
            normalizedConfig
        )

        return {
            agentRuntime: {
                id: result.agentRuntime.id,
                send: result.agentRuntime.send,
                getState: result.agentRuntime.getState,
                subscribe: result.agentRuntime.subscribe
            },
            agentRuntimeId: result.agentRuntimeId
        } satisfies LangGraphAgentCreationResult<TState>
    })

    return Effect.runPromise(program)
}

/**
 * Validate agent state structure
 */
async function validateAgentState<TState extends LangGraphAgentState>(
    state: TState
): Promise<AgentStateValidationResult> {
    const program = validateAgentStateEffect(state)
    return Effect.runPromise(program)
}

/**
 * Create activity payload for LangGraph operations
 */
function createActivityPayload(
    operation: string,
    data?: Record<string, unknown>,
    metadata?: Record<string, unknown>
): LangGraphActivityPayload {
    return {
        operation,
        data: data ?? {},
        metadata: {
            timestamp: new Date().toISOString(),
            source: "ea-sdk",
            version: EA_SDK_VERSION,
            ...metadata
        }
    }
}

/**
 * Validate configuration
 */
async function validateConfiguration(
    config: LangGraphAgentConfig
): Promise<LangGraphAgentConfig> {
    const program = validateConfigurationEffect(config)
    return Effect.runPromise(program)
}

/**
 * Check compatibility requirements
 */
async function checkCompatibility(
    requirements?: {
        readonly minEAVersion?: string
        readonly maxEAVersion?: string
        readonly requiredFeatures?: ReadonlyArray<string>
    }
): Promise<boolean> {
    const program = checkCompatibilityEffect(requirements)
    return Effect.runPromise(program)
}

// Internal Effect-based implementations
function validateAgentStateEffect<TState extends LangGraphAgentState>(
    state: TState
): Effect.Effect<AgentStateValidationResult, EASdkValidationError> {
    return Effect.gen(function* () {
        const errors: string[] = []
        const warnings: string[] = []

        try {
            // Validate required properties
            if (!state.agentRuntime) {
                errors.push("Missing required property: agentRuntime")
            }

            // Validate agentRuntime has required methods
            if (state.agentRuntime) {
                if (typeof state.agentRuntime.run !== 'function') {
                    errors.push("agentRuntime.run is not a function")
                }
                if (typeof state.agentRuntime.createLangGraphAgent !== 'function') {
                    errors.push("agentRuntime.createLangGraphAgent is not a function")
                }
            }

            // Validate state structure
            if (state.context !== undefined && typeof state.context !== 'object') {
                errors.push("context property must be an object when provided")
            }

            return {
                isValid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined
            }

        } catch (cause) {
            return yield* Effect.fail(new EASdkValidationError({
                message: "Failed to validate agent state due to unexpected error",
                module: "EASdk",
                method: "validateAgentState",
                cause
            }))
        }
    })
}

function validateConfigurationEffect(
    config: LangGraphAgentConfig
): Effect.Effect<LangGraphAgentConfig, EASdkConfigurationError> {
    return Effect.gen(function* () {
        try {
            // Validate recursionLimit
            if (config.recursionLimit !== undefined) {
                if (typeof config.recursionLimit !== 'number' || config.recursionLimit < 1 || config.recursionLimit > 1000) {
                    return yield* Effect.fail(new EASdkConfigurationError({
                        message: "recursionLimit must be a number between 1 and 1000",
                        module: "EASdk",
                        method: "validateConfiguration",
                        configKey: "recursionLimit",
                        expectedType: "number (1-1000)"
                    }))
                }
            }

            // Apply defaults for missing values
            const normalizedConfig: LangGraphAgentConfig = {
                ...DEFAULT_LANGGRAPH_CONFIG,
                ...config
            }

            return normalizedConfig

        } catch (cause) {
            return yield* Effect.fail(new EASdkConfigurationError({
                message: "Failed to validate configuration due to unexpected error",
                module: "EASdk",
                method: "validateConfiguration",
                cause
            }))
        }
    })
}

function checkCompatibilityEffect(
    requirements?: {
        readonly minEAVersion?: string
        readonly maxEAVersion?: string
        readonly requiredFeatures?: ReadonlyArray<string>
    }
): Effect.Effect<boolean, EASdkCompatibilityError> {
    return Effect.gen(function* () {
        try {
            // Basic version and feature checking
            if (requirements?.requiredFeatures) {
                const unsupportedFeatures = requirements.requiredFeatures.filter(
                    feature => !SUPPORTED_FEATURES.includes(feature as any)
                )
                if (unsupportedFeatures.length > 0) {
                    return yield* Effect.fail(new EASdkCompatibilityError({
                        message: `Unsupported features required: ${unsupportedFeatures.join(", ")}`,
                        module: "EASdk",
                        method: "checkCompatibility",
                        component: "features"
                    }))
                }
            }

            return true

        } catch (cause) {
            return yield* Effect.fail(new EASdkCompatibilityError({
                message: "Failed to check compatibility due to unexpected error",
                module: "EASdk",
                method: "checkCompatibility",
                cause
            }))
        }
    })
}

/**
 * EASdk Library - Plain JavaScript functions for LangGraph integration
 */
export const EASdk = {
    createLangGraphAgentState,
    createEnhancedLangGraphAgent,
    validateAgentState,
    createActivityPayload,
    validateConfiguration,
    checkCompatibility
} as const 