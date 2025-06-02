import { Effect } from "effect"
import { AgentRuntimeService } from "../service.js"
import type { EASdkApi } from "./api.js"
import {
    EASdkAgentCreationError,
    EASdkCompatibilityError,
    EASdkConfigurationError,
    EASdkOperationError,
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
 * EA SDK service implementation using Effect.Service pattern.
 * 
 * Provides enhanced utilities for LangGraph agent integration with comprehensive
 * validation, configuration management, and error handling capabilities.
 */
export class EASdk extends Effect.Service<EASdkApi>()("EASdk", {
    effect: Effect.gen(function* () {
        // Access the AgentRuntimeService for delegation
        const agentRuntime = yield* AgentRuntimeService

        const createEnhancedLangGraphAgent = <TState extends LangGraphAgentState>(
            params: CreateLangGraphAgentParams<TState>
        ) => Effect.gen(function* () {
            yield* Effect.logInfo("Creating enhanced LangGraph agent", {
                hasConfig: !!params.config,
                agentType: "langgraph"
            })

            // Step 1: Validate the initial state
            const validation = yield* validateAgentState(params.initialState)
            if (!validation.isValid) {
                yield* Effect.logError("Agent state validation failed", {
                    errors: validation.errors,
                    warnings: validation.warnings
                })
                return yield* Effect.fail(new EASdkValidationError({
                    message: `Invalid LangGraph agent state: ${validation.errors?.join(", ") || "validation failed"}`,
                    module: "EASdk",
                    method: "createEnhancedLangGraphAgent",
                    validationErrors: validation.errors
                }))
            }

            // Step 2: Validate and normalize configuration
            const normalizedConfig = yield* validateConfiguration(params.config || {})

            // Step 3: Prepare enhanced options with EA-specific configurations
            const enhancedOptions = {
                ...normalizedConfig,
                // Add EA-specific metadata
                ea_sdk_version: EA_SDK_VERSION,
                ea_creation_timestamp: Date.now()
            }

            yield* Effect.logInfo("Configuration validated and normalized", {
                config: enhancedOptions
            })

            // Step 4: Delegate to AgentRuntimeService with enhanced configuration
            const result = yield* agentRuntime.createLangGraphAgent(
                params.compiledGraph,
                params.initialState,
                enhancedOptions
            ).pipe(
                Effect.mapError(error => new EASdkAgentCreationError({
                    message: "Failed to create LangGraph agent via AgentRuntimeService",
                    module: "EASdk",
                    method: "createEnhancedLangGraphAgent",
                    agentType: "langgraph",
                    creationStep: "runtime_creation",
                    cause: error
                }))
            )

            yield* Effect.logInfo("Enhanced LangGraph agent created successfully", {
                agentId: result.agentRuntimeId
            })

            // Step 5: Return typed result
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

        const validateAgentState = <TState extends LangGraphAgentState>(
            state: TState
        ): Effect.Effect<AgentStateValidationResult, EASdkValidationError> => Effect.gen(function* () {
            yield* Effect.logDebug("Validating agent state", {
                hasAgentRuntime: !!state.agentRuntime,
                hasContext: !!state.context
            })

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
                    if (typeof state.agentRuntime.getModelService !== 'function') {
                        warnings.push("agentRuntime.getModelService is not available - some features may be limited")
                    }
                }

                // Validate state structure
                if (state.context !== undefined && typeof state.context !== 'object') {
                    errors.push("context property must be an object when provided")
                }

                // Check for potential naming conflicts
                const reservedKeys = ['agentRuntime', 'context']
                const stateKeys = Object.keys(state)
                const conflicts = stateKeys.filter(key =>
                    reservedKeys.includes(key) &&
                    typeof (state as any)[key] !== 'object' &&
                    (state as any)[key] !== undefined
                )
                if (conflicts.length > 0) {
                    warnings.push(`Potential conflicts with reserved keys: ${conflicts.join(", ")}`)
                }

                const result: AgentStateValidationResult = {
                    isValid: errors.length === 0,
                    errors: errors.length > 0 ? errors : undefined,
                    warnings: warnings.length > 0 ? warnings : undefined
                }

                yield* Effect.logDebug("Agent state validation completed", {
                    isValid: result.isValid,
                    errorCount: errors.length,
                    warningCount: warnings.length
                })

                return result

            } catch (cause) {
                yield* Effect.logError("Agent state validation encountered an error", { cause })
                return yield* Effect.fail(new EASdkValidationError({
                    message: "Failed to validate agent state due to unexpected error",
                    module: "EASdk",
                    method: "validateAgentState",
                    cause
                }))
            }
        })

        const createActivityPayload = (
            operation: string,
            data?: Record<string, unknown>,
            metadata?: Record<string, unknown>
        ): Effect.Effect<LangGraphActivityPayload, never> => Effect.gen(function* () {
            yield* Effect.logDebug("Creating activity payload", {
                operation,
                hasData: !!data,
                hasMetadata: !!metadata
            })

            const payload: LangGraphActivityPayload = {
                operation,
                data: data ?? {},
                metadata: {
                    timestamp: new Date().toISOString(),
                    source: "ea-sdk",
                    version: EA_SDK_VERSION,
                    ...metadata
                }
            }

            return payload
        })

        const validateConfiguration = (
            config: LangGraphAgentConfig
        ): Effect.Effect<LangGraphAgentConfig, EASdkConfigurationError> => Effect.gen(function* () {
            yield* Effect.logDebug("Validating configuration", { config })

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

                // Validate timeoutMs
                if (config.timeoutMs !== undefined) {
                    if (typeof config.timeoutMs !== 'number' || config.timeoutMs < 1000 || config.timeoutMs > 300000) {
                        return yield* Effect.fail(new EASdkConfigurationError({
                            message: "timeoutMs must be a number between 1000 and 300000 (1s to 5min)",
                            module: "EASdk",
                            method: "validateConfiguration",
                            configKey: "timeoutMs",
                            expectedType: "number (1000-300000)"
                        }))
                    }
                }

                // Validate enableStreaming
                if (config.enableStreaming !== undefined && typeof config.enableStreaming !== 'boolean') {
                    return yield* Effect.fail(new EASdkConfigurationError({
                        message: "enableStreaming must be a boolean",
                        module: "EASdk",
                        method: "validateConfiguration",
                        configKey: "enableStreaming",
                        expectedType: "boolean"
                    }))
                }

                // Validate errorHandling
                if (config.errorHandling !== undefined) {
                    const validErrorHandling = ["propagate", "capture", "retry"] as const
                    if (!validErrorHandling.includes(config.errorHandling as any)) {
                        return yield* Effect.fail(new EASdkConfigurationError({
                            message: `errorHandling must be one of: ${validErrorHandling.join(", ")}`,
                            module: "EASdk",
                            method: "validateConfiguration",
                            configKey: "errorHandling",
                            expectedType: `"${validErrorHandling.join('" | "')}"`
                        }))
                    }
                }

                // Validate retryAttempts
                if (config.retryAttempts !== undefined) {
                    if (typeof config.retryAttempts !== 'number' || config.retryAttempts < 0 || config.retryAttempts > 10) {
                        return yield* Effect.fail(new EASdkConfigurationError({
                            message: "retryAttempts must be a number between 0 and 10",
                            module: "EASdk",
                            method: "validateConfiguration",
                            configKey: "retryAttempts",
                            expectedType: "number (0-10)"
                        }))
                    }
                }

                // Apply defaults for missing values
                const normalizedConfig: LangGraphAgentConfig = {
                    ...DEFAULT_LANGGRAPH_CONFIG,
                    ...config
                }

                yield* Effect.logDebug("Configuration validation completed", {
                    normalizedConfig
                })

                return normalizedConfig

            } catch (cause) {
                yield* Effect.logError("Configuration validation encountered an error", { cause })
                return yield* Effect.fail(new EASdkConfigurationError({
                    message: "Failed to validate configuration due to unexpected error",
                    module: "EASdk",
                    method: "validateConfiguration",
                    cause
                }))
            }
        })

        const checkCompatibility = (
            requirements?: {
                readonly minEAVersion?: string
                readonly maxEAVersion?: string
                readonly requiredFeatures?: ReadonlyArray<string>
            }
        ): Effect.Effect<boolean, EASdkCompatibilityError> => Effect.gen(function* () {
            yield* Effect.logDebug("Checking compatibility", { requirements })

            try {
                // For now, we'll do basic version checking
                // In a real implementation, you'd use a proper semver library
                if (requirements?.minEAVersion) {
                    const currentVersion = EA_SDK_VERSION
                    // Simple version comparison (in production, use semver)
                    if (currentVersion < requirements.minEAVersion) {
                        return yield* Effect.fail(new EASdkCompatibilityError({
                            message: `EA SDK version ${currentVersion} is below minimum required version ${requirements.minEAVersion}`,
                            module: "EASdk",
                            method: "checkCompatibility",
                            currentVersion,
                            requiredVersion: requirements.minEAVersion,
                            component: "ea-sdk"
                        }))
                    }
                }

                if (requirements?.maxEAVersion) {
                    const currentVersion = EA_SDK_VERSION
                    if (currentVersion > requirements.maxEAVersion) {
                        return yield* Effect.fail(new EASdkCompatibilityError({
                            message: `EA SDK version ${currentVersion} is above maximum supported version ${requirements.maxEAVersion}`,
                            module: "EASdk",
                            method: "checkCompatibility",
                            currentVersion,
                            requiredVersion: requirements.maxEAVersion,
                            component: "ea-sdk"
                        }))
                    }
                }

                // Check required features
                if (requirements?.requiredFeatures) {
                    const unsupportedFeatures = requirements.requiredFeatures.filter(
                        feature => !SUPPORTED_FEATURES.includes(feature as any)
                    )
                    if (unsupportedFeatures.length > 0) {
                        return yield* Effect.fail(new EASdkCompatibilityError({
                            message: `Unsupported features required: ${unsupportedFeatures.join(", ")}. Supported features: ${SUPPORTED_FEATURES.join(", ")}`,
                            module: "EASdk",
                            method: "checkCompatibility",
                            component: "features"
                        }))
                    }
                }

                yield* Effect.logDebug("Compatibility check passed")
                return true

            } catch (cause) {
                yield* Effect.logError("Compatibility check encountered an error", { cause })
                return yield* Effect.fail(new EASdkCompatibilityError({
                    message: "Failed to check compatibility due to unexpected error",
                    module: "EASdk",
                    method: "checkCompatibility",
                    cause
                }))
            }
        })

        const createErrorHandler = (
            agentId: string,
            operation: string
        ): Effect.Effect<
            (error: unknown) => Effect.Effect<never, EASdkOperationError>,
            never
        > => Effect.gen(function* () {
            yield* Effect.logDebug("Creating error handler", { agentId, operation })

            const errorHandler = (error: unknown): Effect.Effect<never, EASdkOperationError> => {
                return Effect.fail(new EASdkOperationError({
                    message: `Operation '${operation}' failed for agent '${agentId}': ${error instanceof Error ? error.message : String(error)}`,
                    module: "EASdk",
                    method: "errorHandler",
                    operation,
                    agentId,
                    cause: error
                }))
            }

            return errorHandler
        })

        return {
            createEnhancedLangGraphAgent,
            validateAgentState,
            createActivityPayload,
            validateConfiguration,
            checkCompatibility,
            createErrorHandler
        } satisfies EASdkApi
    }),
    dependencies: [AgentRuntimeService.Default]
}) { } 