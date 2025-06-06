import { Effect } from "effect"
import type { AgentRuntimeServiceApi } from "../ea-agent-runtime/api.js"
import { EASdkOperationError } from "./errors.js"
import type { LangGraphActivityPayload, LangGraphAgentState } from "./types.js"

/**
 * Async bridge function to execute Effect-based logic from LangGraph nodes.
 * Provides a Promise-based interface that LangGraph can easily consume.
 * 
 * @template TOutput The output type of the Effect
 * @template TError The error type of the Effect
 * @param agentRuntime The EA AgentRuntimeService instance
 * @param effect The Effect to execute
 * @param context Optional context for error reporting
 * @returns Promise resolving to the Effect's output
 * 
 * @example
 * ```typescript
 * // In a LangGraph node
 * async function myLangGraphNode(state: MyAgentState) {
 *   const result = await runEffect(state.agentRuntime, 
 *     Effect.gen(function* () {
 *       const modelService = yield* state.agentRuntime.getModelService()
 *       return yield* modelService.generateResponse("Hello")
 *     }),
 *     { operation: "generate_response", nodeId: "my-node" }
 *   )
 *   
 *   return { ...state, lastResponse: result }
 * }
 * ```
 */
export function runEffect<TOutput, TError = unknown>(
    agentRuntime: AgentRuntimeServiceApi,
    effect: Effect.Effect<TOutput, TError>,
    context?: {
        readonly operation?: string
        readonly nodeId?: string
        readonly agentId?: string
    }
): Promise<TOutput> {
    return agentRuntime.run(
        effect.pipe(
            Effect.mapError(error => new EASdkOperationError({
                message: `Effect execution failed in LangGraph node${context?.nodeId ? ` (${context.nodeId})` : ""}`,
                module: "EASdk",
                method: "runEffect",
                operation: context?.operation,
                agentId: context?.agentId,
                cause: error
            }))
        )
    )
}

/**
 * Creates a standardized activity payload for LangGraph operations.
 * Convenience function that doesn't require the full SDK service.
 * 
 * @param operation The operation identifier
 * @param data Operation-specific data
 * @param metadata Additional metadata
 * @returns Activity payload with EA conventions
 * 
 * @example
 * ```typescript
 * const activity = createActivity("user_message", 
 *   { message: "Hello", userId: "123" },
 *   { priority: "high", source: "chat-ui" }
 * )
 * ```
 */
export function createActivity(
    operation: string,
    data?: Record<string, unknown>,
    metadata?: Record<string, unknown>
): LangGraphActivityPayload {
    return {
        operation,
        data: data ?? {},
        metadata: {
            timestamp: new Date().toISOString(),
            source: "ea-sdk-helpers",
            version: "1.0.0",
            ...metadata
        }
    }
}

/**
 * Logs structured activity data using Effect's logging system.
 * Provides standardized activity logging for EA agents.
 * 
 * @param operation The operation identifier
 * @param data Operation-specific data
 * @param metadata Additional metadata
 * @returns Effect that logs the activity
 * 
 * @example
 * ```typescript
 * // In an Effect.gen function
 * yield* logActivity("user_message", 
 *   { message: "Hello", userId: "123" },
 *   { priority: "high", nodeId: "chat-input" }
 * )
 * 
 * // Via runEffect helper
 * await runEffect(runtime, logActivity("agent_response", { response: "Hi there!" }))
 * ```
 */
export function logActivity(
    operation: string,
    data: Record<string, unknown> = {},
    metadata: Record<string, unknown> = {}
): Effect.Effect<void, never> {
    return Effect.gen(function* () {
        const activity = {
            operation,
            data,
            metadata: {
                timestamp: new Date().toISOString(),
                source: "ea-sdk",
                version: "1.0.0",
                ...metadata
            }
        }

        yield* Effect.logInfo(`EA Agent Activity: ${operation}`, activity)
    })
}

/**
 * Helper to safely access nested properties in agent state.
 * Provides type-safe access with fallback values.
 * 
 * @template TState The agent state type
 * @template TValue The expected value type
 * @param state The agent state
 * @param path Dot-notation path to the property
 * @param fallback Fallback value if property doesn't exist
 * @returns The property value or fallback
 * 
 * @example
 * ```typescript
 * const userId = getStateProperty(state, "context.userId", "anonymous")
 * const messageCount = getStateProperty(state, "messages.length", 0)
 * ```
 */
export function getStateProperty<TState extends LangGraphAgentState, TValue>(
    state: TState,
    path: string,
    fallback: TValue
): TValue {
    try {
        const parts = path.split('.')
        let current: any = state

        for (const part of parts) {
            if (current === null || current === undefined) {
                return fallback
            }
            current = current[part]
        }

        return current !== undefined ? current : fallback
    } catch {
        return fallback
    }
}

/**
 * Helper to safely update nested properties in agent state.
 * Creates a new state object with the updated property.
 * 
 * @template TState The agent state type
 * @param state The current agent state
 * @param path Dot-notation path to the property
 * @param value The new value to set
 * @returns New state object with updated property
 * 
 * @example
 * ```typescript
 * const newState = setStateProperty(state, "context.lastActivity", Date.now())
 * const updatedState = setStateProperty(state, "messages", [...state.messages, newMessage])
 * ```
 */
export function setStateProperty<TState extends LangGraphAgentState>(
    state: TState,
    path: string,
    value: unknown
): TState {
    const parts = path.split('.')

    // Create a safe deep clone that preserves functions and complex objects
    const cloneValue = (obj: any): any => {
        if (obj === null || typeof obj !== 'object') return obj
        if (obj instanceof Date) return new Date(obj.getTime())
        if (Array.isArray(obj)) return obj.map(cloneValue)
        if (typeof obj === 'function') return obj // Preserve functions as-is

        const cloned: any = {}
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                cloned[key] = cloneValue(obj[key])
            }
        }
        return cloned
    }

    const newState = cloneValue(state)

    let current: any = newState
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (part) {
            if (current[part] === undefined) {
                current[part] = {}
            } else if (current[part] === null) {
                current[part] = {}
            }
            current = current[part]
        }
    }

    const lastPart = parts[parts.length - 1]
    if (lastPart) {
        current[lastPart] = value
    }

    return newState
}

/**
 * Helper to merge state updates into agent state.
 * Performs a shallow merge of properties.
 * 
 * @template TState The agent state type
 * @param state The current agent state
 * @param updates Partial state updates to apply
 * @returns New state object with updates applied
 * 
 * @example
 * ```typescript
 * const newState = mergeState(state, {
 *   currentStep: "processing",
 *   lastUpdated: Date.now()
 * })
 * ```
 */
export function mergeState<TState extends LangGraphAgentState>(
    state: TState,
    updates: Partial<TState>
): TState {
    return {
        ...state,
        ...updates
    }
}

/**
 * Creates a context-aware error handler for LangGraph nodes.
 * Returns a function that can be used in try-catch blocks.
 * 
 * @param nodeId Identifier for the LangGraph node
 * @param agentId Optional agent identifier
 * @returns Error handler function
 * 
 * @example
 * ```typescript
 * async function myLangGraphNode(state: MyAgentState) {
 *   const handleError = createNodeErrorHandler("process-message", state.agentRuntime.id)
 *   
 *   try {
 *     // ... node logic
 *     return newState
 *   } catch (error) {
 *     throw handleError(error, "Failed to process message")
 *   }
 * }
 * ```
 */
export function createNodeErrorHandler(
    nodeId: string,
    agentId?: string
): (error: unknown, message?: string) => EASdkOperationError {
    return (error: unknown, message?: string) => {
        return new EASdkOperationError({
            message: message || `Error in LangGraph node '${nodeId}'`,
            module: "EASdk",
            method: "nodeErrorHandler",
            operation: nodeId,
            agentId,
            cause: error
        })
    }
}

/**
 * Async wrapper for LangGraph nodes that provides standard error handling.
 * Wraps node functions with consistent error handling and logging.
 * 
 * @template TState The agent state type
 * @param nodeId Identifier for the node (for error context)
 * @param nodeFunction The actual node function to wrap
 * @returns Wrapped node function with error handling
 * 
 * @example
 * ```typescript
 * const safeProcessMessage = wrapLangGraphNode("process-message", 
 *   async (state: MyAgentState) => {
 *     // ... your node logic here
 *     return updatedState
 *   }
 * )
 * ```
 */
export function wrapLangGraphNode<TState extends LangGraphAgentState>(
    nodeId: string,
    nodeFunction: (state: TState) => Promise<TState>
): (state: TState) => Promise<TState> {
    return async (state: TState): Promise<TState> => {
        const handleError = createNodeErrorHandler(nodeId, getStateProperty(state, "agentRuntime.id", "unknown"))

        try {
            return await nodeFunction(state)
        } catch (error) {
            throw handleError(error, `Node '${nodeId}' execution failed`)
        }
    }
}

/**
 * Helper to validate that agent state has required properties.
 * Throws descriptive errors if validation fails.
 * 
 * @template TState The agent state type
 * @param state The agent state to validate
 * @param requiredPaths Array of dot-notation paths that must exist
 * @param context Optional context for error messages
 * @throws {EASdkOperationError} If validation fails
 * 
 * @example
 * ```typescript
 * validateStateStructure(state, [
 *   "agentRuntime",
 *   "messages",
 *   "context.userId"
 * ], { nodeId: "validate-input" })
 * ```
 */
export function validateStateStructure<TState extends LangGraphAgentState>(
    state: TState,
    requiredPaths: ReadonlyArray<string>,
    context?: { readonly nodeId?: string; readonly operation?: string }
): void {
    const missingPaths: string[] = []

    for (const path of requiredPaths) {
        const value = getStateProperty(state, path, undefined)
        if (value === undefined) {
            missingPaths.push(path)
        }
    }

    if (missingPaths.length > 0) {
        throw new EASdkOperationError({
            message: `State validation failed: missing required properties [${missingPaths.join(", ")}]`,
            module: "EASdk",
            method: "validateStateStructure",
            operation: context?.operation || context?.nodeId || "state_validation"
        })
    }
}

/**
 * Creates a simple state transformer function for common update patterns.
 * Useful for creating reusable state update functions.
 * 
 * @template TState The agent state type
 * @template TInput Input type for the transformer
 * @param transformer Function that takes input and current state, returns new state
 * @returns Transformer function that can be reused
 * 
 * @example
 * ```typescript
 * const addMessage = createStateTransformer<MyAgentState, string>(
 *   (message, state) => ({
 *     ...state,
 *     messages: [...state.messages, { content: message, timestamp: Date.now() }]
 *   })
 * )
 * 
 * // Usage in LangGraph node
 * const newState = addMessage("Hello, world!", state)
 * ```
 */
export function createStateTransformer<TState extends LangGraphAgentState, TInput>(
    transformer: (input: TInput, state: TState) => TState
): (input: TInput, state: TState) => TState {
    return transformer
} 