// File: types.ts

import type { IModelService } from '@services/model/types.js';
import type { IPromptService } from '@services/prompt/types.js';
import type { IProviderService } from '@services/provider/types.js';
import type { ITaskService } from '@services/task/types.js'; // Import service interfaces if needed by factories etc.
import type { z } from 'zod';
import type { AgentNode } from './AgentNode.js'; // Import base AgentNode type
import type { AgentConfigSchema, AgentRunSchema } from './schema.js'; // Assuming schema.ts path

// --- Core Agent State Components ---

export interface AgentErrors {
    readonly errors: string[];
    readonly errorCount: number;
}

export interface NodeStatus {
    readonly nodeId: string;
    readonly status: 'entering' | 'running' | 'completed' | 'error';
    readonly timestamp: string;
    readonly error?: string; // Added error field based on usage
    readonly details?: string;
}

export interface AgentStatus {
    overallStatus?: 'running' | 'completed' | 'error' | 'failed'; // Added 'failed' based on usage
    nodeHistory: Array<NodeStatus>; // Use NodeStatus consistently
    currentNode?: string;
}

export interface AgentLogs {
    readonly logs: string[];
    readonly logCount: number;
}

export type AgentRun = z.infer<typeof AgentRunSchema>;

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

/**
 * The central state object passed through the agent graph.
 * @template I Input type for the agent run.
 * @template O Output type expected from the agent run.
 * @template A Agent-specific state type managed within the graph.
 */
export interface AgentState<I, O, A> {
    readonly config: AgentConfig;
    readonly agentRun: AgentRun;
    readonly status: AgentStatus;
    readonly logs: AgentLogs;
    readonly errors: AgentErrors;
    readonly input: I;
    readonly output: O;
    readonly agentState: A;
}

// --- Agent Graph Configuration & Definitions ---

/**
 * Configuration object passed to a graph execution run.
 */
export interface AgentGraphConfig {
    readonly debug?: boolean;
    readonly maxRetries?: number;
    readonly timeout?: number;
    readonly tags?: string[]; // Added based on LangGraph usage
    readonly [key: string]: any; // Allow arbitrary config values
}

/**
 * Defines a node within the basic graph structure.
 * @template T The specific AgentState subtype for this graph.
 */
export interface GraphNode<T extends AgentState<any, any, any>> {
    node: AgentNode<T>; // The actual node instance
    next: Array<string>; // IDs of the next node(s). 'END' signifies termination.
}

/**
 * Defines the overall structure for the default AgentGraph.
 * Keys are node IDs.
 * @template T The specific AgentState subtype for this graph.
 */
export interface GraphDefinition<T extends AgentState<any, any, any>> {
    [key: string]: GraphNode<T>;
}

/**
 * Defines a node within the LangGraph structure, supporting conditional routing.
 * @template T The specific AgentState subtype for this graph.
 */
export interface LangGraphNodeDefinition<T extends AgentState<any, any, any>> {
    node: AgentNode<T>; // The actual node instance
    next?: Array<string>; // Optional: For simple next steps (overridden by conditionalNext if present)
    conditionalNext?: {
        sourceField: keyof T['agentState']; // Field in agentState to check for routing
        routes: Record<string | number | symbol, string>; // Maps field values to next node IDs
        default?: string; // Optional default route if no match
    };
}

/**
 * Defines the overall graph structure specifically for LangGraphAgentGraph.
 * Keys are node IDs.
 * @template T The specific AgentState subtype for this graph.
 */
export interface LangGraphDefinition<T extends AgentState<any, any, any>> {
    [key: string]: LangGraphNodeDefinition<T>;
}


// --- Agent Graph Implementation Interfaces ---

/**
 * Interface defining the contract for AgentGraph execution implementations.
 * @template T The specific AgentState subtype handled by this implementation.
 */
export interface AgentGraphImplementation<T extends AgentState<any, any, any>> {
    /**
     * Creates a runnable function that executes the entire graph.
     * Takes the initial state and optional config, returns the final state.
     */
    runnable(): (state: T, config?: AgentGraphConfig) => Promise<T>;

    /**
     * Enables or disables debug mode for detailed logging within the implementation.
     */
    setDebug(enabled: boolean): void;
}

/**
 * Factory interface for creating AgentGraph implementations.
 */
export interface AgentGraphFactory {
    /**
     * Creates an instance of an AgentGraph implementation.
     * @template S The specific AgentState subtype for the graph.
     */
    createAgentGraph<S extends AgentState<any, any, any>>(
        // Use a union type or a more generic base definition if possible,
        // otherwise, the factory might need type assertions or overloads.
        // Using 'any' here for simplicity, but could be refined.
        graph: GraphDefinition<S> | LangGraphDefinition<S> | any,
        startNodeId: string,
        taskService: ITaskService,
        providerService: IProviderService,
        modelService: IModelService,
        promptService: IPromptService,
    ): AgentGraphImplementation<S>;
}

// --- Utility Types (Optional) ---

// Example: If needed for LangGraph state channel definitions
// export interface ChannelReducer<T> {
//   reducer: (a: T, b: T) => T;
// }
