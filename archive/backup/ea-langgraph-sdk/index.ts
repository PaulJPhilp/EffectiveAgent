/**
 * @file EA SDK (LangGraph Support Module)
 * 
 * The Effective Agent Software Development Kit for LangGraph integration.
 * Provides essential building blocks for connecting LangGraph agents to the
 * EA AgentRuntimeService and leveraging its capabilities.
 * 
 * This module offers:
 * - Base interfaces and types for LangGraph agent state
 * - Enhanced agent creation with validation and configuration
 * - Standardized activity payload formats
 * - Error handling and compatibility checking utilities
 * - Helper functions for common integration patterns
 * 
 * @example
 * ```typescript
 * import { EASdk, LangGraphAgentState } from '@/agent-runtime/langgraph-support'
 * 
 * interface MyAgentState extends LangGraphAgentState<{ userId: string }> {
 *   messages: Array<{ role: string; content: string }>
 * }
 * 
 * const sdk = yield* EASdk
 * const agent = yield* sdk.createEnhancedLangGraphAgent({
 *   compiledGraph: myGraph,
 *   initialState: { agentRuntime, messages: [] },
 *   config: { recursionLimit: 30 }
 * })
 * ```
 */


// Re-export for convenience - commonly used types from parent modules
export type { AgentRuntimeServiceApi } from "@/ea-agent-runtime/api.js"
export type { AgentActivity, AgentRuntimeId } from "@/ea-agent-runtime/types.js"

// Error types
export {
    EASdkAgentCreationError, EASdkCompatibilityError, EASdkConfigurationError, EASdkOperationError, EASdkValidationError
} from "./errors.js"

// Helper utilities for LangGraph integration
export {
    createActivity, createNodeErrorHandler, createStateTransformer, getStateProperty, mergeState, runEffect, setStateProperty, validateStateStructure, wrapLangGraphNode
} from "./helpers.js"
// Core library
export { EASdk } from "./service.js"
// Types and interfaces
export type {
    AgentStateValidationResult, CreateLangGraphAgentParams, LangGraphActivityPayload, LangGraphAgentConfig, LangGraphAgentCreationResult, LangGraphAgentState
} from "./types.js"

