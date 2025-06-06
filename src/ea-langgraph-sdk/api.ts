import { Effect } from "effect"
import type { AgentRuntimeServiceApi } from "../ea-agent-runtime/api.js"
import type { AgentRuntimeError } from "../ea-agent-runtime/errors.js"
import type {
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
 * EA SDK service for LangGraph integration support.
 * 
 * Provides utilities and helpers for LangGraph agent development within the
 * Effective Agent framework. This service acts as a bridge between LangGraph
 * agents and the EA runtime system, offering enhanced functionality and
 * standardized patterns for integration.
 * 
 * @example
 * ```typescript
 * const sdk = yield* EASdk
 * 
 * const result = yield* sdk.createEnhancedLangGraphAgent({
 *   compiledGraph: myGraph,
 *   initialState: { agentRuntime, messages: [] },
 *   config: { recursionLimit: 30 }
 * })
 * ```
 */
export interface EASdkApi {
    /**
     * Creates a new LangGraphAgentState object with the required agentRuntime property.
     * 
     * This helper function simplifies the creation of LangGraph agent state objects
     * by ensuring the agentRuntime property is properly set and providing a convenient
     * way to include additional state properties and typed context.
     * 
     * @template TContext The type for the context property
     * @template TState Additional state properties
     * @param agentRuntime The AgentRuntimeService instance to include in the state
     * @param context Optional typed context data
     * @param additionalState Optional additional state properties
     * @returns Effect containing the new LangGraphAgentState object
     * 
     * @example
     * ```typescript
     * const initialState = yield* sdk.createLangGraphAgentState(
     *   agentRuntime,
     *   { userId: "123", sessionId: "abc" },
     *   { 
     *     messages: [],
     *     currentStep: "waiting",
     *     metadata: { createdAt: Date.now() }
     *   }
     * )
     * ```
     */
    readonly createLangGraphAgentState: <
        TContext extends Record<string, unknown> = Record<string, unknown>,
        TState extends Record<string, unknown> = Record<string, unknown>
    >(
        agentRuntime: AgentRuntimeServiceApi,
        context?: TContext,
        additionalState?: TState
    ) => Effect.Effect<
        LangGraphAgentState<TContext> & TState,
        never
    >

    /**
     * Creates a configured LangGraph agent runtime with enhanced EA capabilities.
     * 
     * This method provides an enhanced version of the basic createLangGraphAgent
     * functionality with additional validation, configuration, and error handling.
     * It validates the agent state, applies default configurations, and ensures
     * proper integration with the EA runtime system.
     * 
     * @template TState The LangGraph agent state type, must extend LangGraphAgentState
     * @param params Configuration parameters for the agent
     * @returns Effect containing the created agent runtime and ID
     * @throws {EASdkValidationError} When agent state validation fails
     * @throws {EASdkAgentCreationError} When agent creation fails
     * @throws {AgentRuntimeError} When underlying runtime operations fail
     * 
     * @example
     * ```typescript
     * const result = yield* sdk.createEnhancedLangGraphAgent({
     *   compiledGraph: {
     *     invoke: async (state, options) => await myGraph.invoke(state, options)
     *   },
     *   initialState: {
     *     agentRuntime: runtimeService,
     *     messages: [],
     *     context: { userId: "123" }
     *   },
     *   config: {
     *     recursionLimit: 25,
     *     timeoutMs: 45000,
     *     errorHandling: "retry",
     *     retryAttempts: 2
     *   }
     * })
     * ```
     */
    readonly createEnhancedLangGraphAgent: <TState extends LangGraphAgentState>(
        params: CreateLangGraphAgentParams<TState>
    ) => Effect.Effect<
        LangGraphAgentCreationResult<TState>,
        EASdkValidationError | EASdkAgentCreationError | AgentRuntimeError
    >

    /**
     * Validates a LangGraph agent state to ensure EA compatibility.
     * 
     * Performs comprehensive validation of the agent state to ensure it meets
     * EA integration requirements. Checks for required properties, validates
     * the agentRuntime instance, and verifies type compatibility.
     * 
     * @template TState The LangGraph agent state type
     * @param state The state to validate
     * @returns Effect containing detailed validation results
     * @throws {EASdkValidationError} When validation encounters an error
     * 
     * @example
     * ```typescript
     * const validation = yield* sdk.validateAgentState(myAgentState)
     * if (!validation.isValid) {
     *   console.log("Validation errors:", validation.errors)
     * }
     * ```
     */
    readonly validateAgentState: <TState extends LangGraphAgentState>(
        state: TState
    ) => Effect.Effect<AgentStateValidationResult, EASdkValidationError>

    /**
     * Creates standardized activity payloads for LangGraph operations.
     * 
     * Generates properly formatted activity payloads that follow EA conventions
     * and include necessary metadata for tracking and debugging. The created
     * payloads are compatible with the EA runtime activity system.
     * 
     * @param operation The operation type identifier
     * @param data Optional operation-specific data
     * @param metadata Optional additional metadata
     * @returns Effect containing the formatted activity payload
     * 
     * @example
     * ```typescript
     * const payload = yield* sdk.createActivityPayload(
     *   "user_message",
     *   { message: "Hello, world!" },
     *   { priority: "high", source: "chat-ui" }
     * )
     * ```
     */
    readonly createActivityPayload: (
        operation: string,
        data?: Record<string, unknown>,
        metadata?: Record<string, unknown>
    ) => Effect.Effect<LangGraphActivityPayload, never>

    /**
     * Validates LangGraph agent configuration for EA compatibility.
     * 
     * Ensures that the provided configuration is valid and compatible with
     * the EA runtime system. Validates configuration values, applies defaults,
     * and checks for any compatibility issues.
     * 
     * @param config The configuration to validate
     * @returns Effect containing the validated and normalized configuration
     * @throws {EASdkConfigurationError} When configuration is invalid
     * 
     * @example
     * ```typescript
     * const validConfig = yield* sdk.validateConfiguration({
     *   recursionLimit: 100,
     *   timeoutMs: 60000,
     *   customParam: "value"
     * })
     * ```
     */
    readonly validateConfiguration: (
        config: LangGraphAgentConfig
    ) => Effect.Effect<LangGraphAgentConfig, EASdkConfigurationError>

    /**
     * Checks compatibility between EA runtime and LangGraph versions.
     * 
     * Verifies that the current EA runtime version is compatible with the
     * LangGraph agent requirements. This helps prevent runtime issues due
     * to version mismatches or API incompatibilities.
     * 
     * @param requirements Optional version requirements to check
     * @returns Effect containing compatibility status
     * @throws {EASdkCompatibilityError} When compatibility issues are detected
     * 
     * @example
     * ```typescript
     * const isCompatible = yield* sdk.checkCompatibility({
     *   minEAVersion: "1.0.0",
     *   maxEAVersion: "2.0.0",
     *   requiredFeatures: ["streaming", "retry"]
     * })
     * ```
     */
    readonly checkCompatibility: (
        requirements?: {
            readonly minEAVersion?: string
            readonly maxEAVersion?: string
            readonly requiredFeatures?: ReadonlyArray<string>
        }
    ) => Effect.Effect<boolean, EASdkCompatibilityError>

    /**
     * Creates a standardized error handler for LangGraph operations.
     * 
     * Provides a consistent error handling pattern for LangGraph agents that
     * integrates with the EA error system. The returned handler can be used
     * in LangGraph nodes to properly handle and report errors.
     * 
     * @param agentId The ID of the agent for error context
     * @param operation The operation being performed for error context
     * @returns Effect containing an error handler function
     * 
     * @example
     * ```typescript
     * const errorHandler = yield* sdk.createErrorHandler("agent-123", "process_message")
     * 
     * // Use in LangGraph node
     * try {
     *   const result = await someOperation()
     *   return result
     * } catch (error) {
     *   return errorHandler(error)
     * }
     * ```
     */
    readonly createErrorHandler: (
        agentId: string,
        operation: string
    ) => Effect.Effect<
        (error: unknown) => Effect.Effect<never, EASdkOperationError>,
        never
    >
}

// Re-export for consumers
export type { AgentRuntimeServiceApi } from "../ea-agent-runtime/api.js"
