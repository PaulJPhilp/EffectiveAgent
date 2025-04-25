// File: AgentGraph.ts

import type { IModelService } from '@services/model/types.js';
import type { IPromptService } from '@services/prompt/types.js';
import type { IProviderService } from '@services/provider/types.js';
import type { ITaskService } from '@services/task/types.js';
import type { AgentNode } from './AgentNode.js'; // Assuming simplified AgentNode
import type {
    AgentErrors,
    AgentLogs,
    AgentState,
    AgentStatus,
    NodeStatus,
} from './types.js';

/**
 * Configuration object for agent graph execution
 */
export interface AgentGraphConfig {
    readonly debug?: boolean;
    readonly maxRetries?: number; // Note: Not implemented in this basic runner
    readonly timeout?: number; // Note: Not implemented in this basic runner
    readonly [key: string]: any;
}

/**
 * Defines a node within the graph structure.
 * @template T The specific AgentState subtype for this graph.
 */
interface GraphNode<T extends AgentState<any, any, any>> {
    node: AgentNode<T>; // The actual node instance
    next: Array<string>; // IDs of the next node(s). 'END' signifies termination.
}

/**
 * Defines the overall graph structure.
 * Keys are node IDs.
 * @template T The specific AgentState subtype for this graph.
 */
export interface GraphDefinition<T extends AgentState<any, any, any>> {
    [key: string]: GraphNode<T>;
}

/**
 * Interface for AgentGraph implementations
 */
export interface AgentGraphImplementation<T extends AgentState<any, any, any>> {
    /**
     * Creates a runnable function that executes the entire graph.
     * Takes the initial state and optional config, returns the final state.
     */
    runnable(): (state: T, config?: AgentGraphConfig) => Promise<T>;

    /**
     * Enables or disables debug mode for detailed logging.
     */
    setDebug(enabled: boolean): void;
}

/**
 * Default service for managing and executing agent graphs sequentially.
 * Executes nodes based on the first entry in their `next` array.
 *
 * @template T The specific AgentState subtype for this graph.
 */
export class AgentGraph<T extends AgentState<any, any, any>>
    implements AgentGraphImplementation<T> {
    private readonly graph: GraphDefinition<T>;
    private readonly startNodeId: string;
    // Services are stored but primarily passed to nodes if needed by their execute methods
    protected readonly taskService: ITaskService;
    protected readonly providerService: IProviderService;
    protected readonly modelService: IModelService;
    protected readonly promptService: IPromptService;
    protected debug: boolean = false; // Instance-level debug flag

    constructor(
        graph: GraphDefinition<T>,
        startNodeId: string,
        taskService: ITaskService,
        providerService: IProviderService,
        modelService: IModelService,
        promptService: IPromptService,
    ) {
        this.validateGraph(graph, startNodeId); // Validate on creation
        this.graph = graph;
        this.startNodeId = startNodeId;
        this.taskService = taskService;
        this.providerService = providerService;
        this.modelService = modelService;
        this.promptService = promptService;
    }

    /**
     * Validates the graph structure: checks for start node, reachability, and defined nodes.
     */
    private validateGraph(graph: GraphDefinition<T>, startNodeId: string): void {
        if (!graph[startNodeId]) {
            throw new Error(`Start node "${startNodeId}" not found in graph`);
        }

        const nodeIds = Object.keys(graph);
        const visited = new Set<string>();
        const queue: string[] = [startNodeId];

        while (queue.length > 0) {
            // Non-null assertion safe due to queue length check
            const currentNodeId = queue.shift()!;

            if (!visited.has(currentNodeId)) {
                visited.add(currentNodeId);
                const nodeDefinition = graph[currentNodeId];

                // This check is technically redundant if all nodes in `next` must exist,
                // but good for robustness if graph definition source is unreliable.
                if (!nodeDefinition) {
                    // This case should ideally be caught by the next check,
                    // finding the node that references the undefined one.
                    throw new Error(`Node "${currentNodeId}" reached but not defined in graph`);
                }

                nodeDefinition.next.forEach(nextNodeId => {
                    if (nextNodeId !== 'END') {
                        // Check if the referenced next node actually exists in the graph definition
                        if (!graph[nextNodeId]) {
                            throw new Error(`Node "${nextNodeId}" referenced by "${currentNodeId}" but not defined in graph`);
                        }
                        if (!visited.has(nextNodeId)) {
                            queue.push(nextNodeId);
                        }
                    }
                });
            }
        }

        // Check for unreachable nodes
        nodeIds.forEach(nodeId => {
            if (!visited.has(nodeId)) {
                // Check if it's the start node itself (only possible in a graph with just the start node pointing to END)
                if (nodeId === startNodeId && graph[nodeId]?.next.includes('END') && nodeIds.length === 1) {
                    // This is reachable
                } else {
                    throw new Error(`Node "${nodeId}" is unreachable from start node "${startNodeId}"`);
                }
            }
        });
    }

    /**
     * Updates the logs array and count within the state.
     */
    private log(state: T, message: string): T {
        return {
            ...state,
            logs: {
                logs: [...state.logs.logs, message],
                logCount: state.logs.logCount + 1,
            },
        };
    }

    /**
     * Updates the node history within the state.
     */
    private updateHistory(state: T, entry: NodeStatus): T {
        return {
            ...state,
            status: {
                ...state.status,
                nodeHistory: [...state.status.nodeHistory, entry],
            },
        };
    }

    /**
     * Creates a runnable function that executes the entire graph.
     */
    public runnable(): (state: T, config?: AgentGraphConfig) => Promise<T> {
        return async (initialState: T, config?: AgentGraphConfig): Promise<T> => {
            // Determine debug status (config overrides instance setting)
            const debugEnabled = config?.debug ?? this.debug;
            let currentState = this.log(initialState, 'Starting graph execution');
            let currentNodeId: string | null = this.startNodeId;

            if (debugEnabled) {
                console.log(`[AgentGraph] Starting graph execution with run ID: ${currentState.agentRun.runId}`);
            }

            while (currentNodeId && currentNodeId !== 'END') {
                const graphNode = this.graph[currentNodeId];
                if (!graphNode) {
                    // Should be caught by validation, but safeguard anyway
                    const errorMsg = `Execution error: Node "${currentNodeId}" not found in graph definition.`;
                    console.error(`[AgentGraph] ${errorMsg}`);
                    currentState = this.log(currentState, errorMsg);
                    currentState = this.updateHistory(currentState, { nodeId: currentNodeId, status: 'error', error: 'Node definition missing', timestamp: new Date().toISOString() });
                    return {
                        ...currentState,
                        status: { ...currentState.status, overallStatus: 'error' },
                        errors: { errors: [...currentState.errors.errors, errorMsg], errorCount: currentState.errors.errorCount + 1 },
                    };
                }

                const nodeInstance = graphNode.node;
                const currentId = currentNodeId; // Capture for async operations/error handling

                try {
                    // --- Node Execution Lifecycle ---
                    if (debugEnabled) console.log(`[AgentGraph] Entering node ${currentId}`);
                    currentState = this.log(currentState, `Entering node ${currentId}`);
                    currentState = { ...currentState, status: { ...currentState.status, currentNode: currentId } };
                    // Add 'entering' status to history (optional, could just add completed/error)
                    // currentState = this.updateHistory(currentState, { nodeId: currentId, status: 'entering', timestamp: new Date().toISOString() });

                    // Execute the node's core logic
                    // Pass services directly if AgentNode constructor doesn't handle it
                    // (Assuming AgentNode constructor takes services as per previous refactor)
                    currentState = await nodeInstance.execute(currentState, config);

                    if (debugEnabled) console.log(`[AgentGraph] Exiting node ${currentId}`);
                    currentState = this.log(currentState, `Exiting node ${currentId}`);
                    currentState = this.updateHistory(currentState, { nodeId: currentId, status: 'completed', timestamp: new Date().toISOString() });
                    currentState = {
                        ...currentState,
                        agentRun: {
                            ...currentState.agentRun,
                            completedSteps: [...currentState.agentRun.completedSteps, currentId]
                        }
                    };

                    // Determine the next node - simple sequential logic
                    const nextNodeId = graphNode.next[0]; // Always take the first one
                    if (!nextNodeId) {
                        throw new Error(`Node "${currentId}" has an empty 'next' array.`);
                    }
                    currentNodeId = nextNodeId === 'END' ? null : nextNodeId; // Set to null if 'END'

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`[AgentGraph] Error executing node ${currentId}:`, error);
                    currentState = this.log(currentState, `Error executing node ${currentId}: ${errorMessage}`);
                    currentState = this.updateHistory(currentState, { nodeId: currentId, status: 'error', error: errorMessage, timestamp: new Date().toISOString() });
                    return {
                        ...currentState,
                        status: { ...currentState.status, overallStatus: 'error', currentNode: currentId },
                        errors: {
                            errors: [...currentState.errors.errors, `Error executing node ${currentId}: ${errorMessage}`],
                            errorCount: currentState.errors.errorCount + 1,
                        },
                    };
                }
            } // End while loop

            if (debugEnabled) {
                console.log(`[AgentGraph] Graph execution finished. Status: ${currentState.status.overallStatus || 'completed'}`);
            }
            currentState = this.log(currentState, 'Graph execution finished');

            // Final state update
            return {
                ...currentState,
                status: {
                    ...currentState.status,
                    overallStatus: currentState.status.overallStatus === 'error' ? 'error' : 'completed', // Ensure final status is set
                    currentNode: 'END', // Mark current node as END
                },
            };
        };
    }

    /**
     * Enables or disables debug mode for detailed logging.
     */
    public setDebug(enabled: boolean): void {
        this.debug = enabled;
        console.log(`[AgentGraph] Debug mode set to: ${enabled}`);
    }
}

// --- Factory Implementation (Remains the same logic) ---

/**
 * Factory interface for creating AgentGraph implementations
 */
export interface AgentGraphFactory {
    createAgentGraph<S extends AgentState<any, any, any>>(
        graph: GraphDefinition<S>,
        startNodeId: string,
        taskService: ITaskService,
        providerService: IProviderService,
        modelService: IModelService,
        promptService: IPromptService,
    ): AgentGraphImplementation<S>;
}

/**
 * Default AgentGraph factory implementation
 */
export class DefaultAgentGraphFactory implements AgentGraphFactory {
    public createAgentGraph<S extends AgentState<any, any, any>>(
        graph: GraphDefinition<S>,
        startNodeId: string,
        taskService: ITaskService,
        providerService: IProviderService,
        modelService: IModelService,
        promptService: IPromptService,
    ): AgentGraphImplementation<S> {
        // Simply instantiates the default AgentGraph
        return new AgentGraph<S>(
            graph,
            startNodeId,
            taskService,
            providerService,
            modelService,
            promptService,
        );
    }
}

/**
 * Helper function to create a new AgentGraph instance using the default factory.
 */
export function createAgentGraph<S extends AgentState<any, any, any>>(
    graph: GraphDefinition<S>,
    startNodeId: string,
    taskService: ITaskService,
    providerService: IProviderService,
    modelService: IModelService,
    promptService: IPromptService,
    // Allow injecting a different factory for testing or extension
    factory: AgentGraphFactory = new DefaultAgentGraphFactory(),
): AgentGraphImplementation<S> {
    return factory.createAgentGraph(
        graph,
        startNodeId,
        taskService,
        providerService,
        modelService,
        promptService,
    );
}
