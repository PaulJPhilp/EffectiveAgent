// File: LangGraphAgentGraph.ts

import type { RunnableConfig } from '@langchain/core/runnables';
import { END, StateGraph } from '@langchain/langgraph';
import type { CompiledStateGraph } from '@langchain/langgraph';
import type { BaseChannel } from '@langchain/langgraph/channels';
import type { IModelService } from '@services/model/types.js';
import type { IPromptService } from '@services/prompt/types.js';
import type { IProviderService } from '@services/provider/types.js';
import type { ITaskService } from '@services/task/types.js';
import type {
    AgentGraphConfig,
    AgentGraphFactory,
    AgentGraphImplementation,
} from './AgentGraph.js'; // Import shared interfaces
import type { AgentNode } from './AgentNode.js'; // Assumes AgentNode has a compatible runnable()
import type { AgentState } from './types.js';

// --- LangGraph Specific Definition ---

/**
 * Defines a node within the LangGraph structure, supporting conditional routing.
 * @template T The specific AgentState subtype for this graph.
 */
interface LangGraphNodeDefinition<T extends AgentState<any, any, any>> {
    node: AgentNode<T>; // The actual node instance
    next?: Array<string>; // Optional: For simple next steps (overridden by conditionalNext if present)
    conditionalNext?: {
        sourceField: keyof T['agentState']; // Field in agentState to check for routing
        routes: Record<string | number | symbol, string>; // Maps field values to next node IDs
        default?: string; // Optional default route if no match
    };
}

/**
 * Defines the overall graph structure for LangGraphAgentGraph.
 * Keys are node IDs.
 * @template T The specific AgentState subtype for this graph.
 */
export interface LangGraphDefinition<T extends AgentState<any, any, any>> {
    [key: string]: LangGraphNodeDefinition<T>;
}

// --- LangGraphAgentGraph Implementation ---

/**
 * AgentGraph implementation using LangGraph's StateGraph.
 * Supports conditional edges and leverages LangGraph's execution engine.
 *
 * @template T The specific AgentState subtype for this graph.
 */
export class LangGraphAgentGraph<T extends AgentState<any, any, any>>
    implements AgentGraphImplementation<T> {
    private readonly compiledGraph: CompiledStateGraph<T, Partial<T>, keyof T>;
    protected debug: boolean = false;
    // Store services if needed for graph construction logic (e.g. dynamic node creation - not used here)
    // protected readonly taskService: ITaskService;
    // ... other services

    constructor(
        graphDefinition: LangGraphDefinition<T>,
        startNodeId: string,
        // Services are passed but primarily used by the AgentNodes themselves
        taskService: ITaskService,
        providerService: IProviderService,
        modelService: IModelService,
        promptService: IPromptService,
    ) {
        // this.taskService = taskService; // Store if needed

        // Define the StateGraph. We pass the full AgentState 'T' as the schema.
        // LangGraph's default channel behavior (LastValue) will handle merging
        // the full state returned by nodes. For more complex state updates,
        // you might define specific channels here.
        const graph = new StateGraph<T>({
            channels: {} as Record<keyof T, BaseChannel<any, any, any>> // Use default channels for now
        });

        // Add nodes to the graph
        for (const nodeId in graphDefinition) {
            const nodeDef = graphDefinition[nodeId];
            // LangGraph expects a RunnableLike. We assume AgentNode provides a compatible runnable().
            graph.addNode(nodeId, nodeDef.node.runnable());
        }

        // Set the entry point
        graph.setEntryPoint(startNodeId);

        // Add edges (simple and conditional)
        for (const nodeId in graphDefinition) {
            const nodeDef = graphDefinition[nodeId];

            if (nodeDef.conditionalNext) {
                // Add conditional edges
                const { sourceField, routes, default: defaultRoute } = nodeDef.conditionalNext;

                // Create the state inspection function
                const conditionalFunc = async (state: T): Promise<string> => {
                    const routeValue = state.agentState[sourceField];
                    // Find the matching route key
                    const nextNode = routes[routeValue as keyof typeof routes] ?? defaultRoute;
                    if (!nextNode) {
                        throw new Error(
                            `Conditional routing failed for node "${nodeId}": No route found for value "${String(routeValue)}" in field "${String(sourceField)}" and no default route provided.`
                        );
                    }
                    if (this.debug) {
                        console.log(`[LangGraph] Conditional route from ${nodeId}: Field '${String(sourceField)}' value '${String(routeValue)}' -> Route '${nextNode}'`);
                    }
                    return nextNode;
                };

                // Add the conditional edge definition to LangGraph
                graph.addConditionalEdges(nodeId, conditionalFunc, { ...routes, default: defaultRoute }); // Pass mapping including default

            } else if (nodeDef.next) {
                // Add simple edges (only if conditionalNext is not defined)
                if (nodeDef.next.length === 0) {
                    // If next is empty, implicitly go to END
                    graph.addEdge(nodeId, END);
                } else if (nodeDef.next.length === 1) {
                    // If only one next node, add a direct edge
                    graph.addEdge(nodeId, nodeDef.next[0]);
                } else {
                    // If multiple next nodes are specified without conditions,
                    // LangGraph requires a conditional edge to decide.
                    // This default implementation doesn't support static fan-out without conditions.
                    // You would typically use a conditional edge returning multiple values or handle fan-out differently.
                    console.warn(`[LangGraph] Node "${nodeId}" has multiple 'next' entries without 'conditionalNext'. Only the first ('${nodeDef.next[0]}') will be considered for a simple edge. For fan-out, use conditional edges.`);
                    graph.addEdge(nodeId, nodeDef.next[0]); // Add edge only to the first for basic compatibility
                }
            } else {
                // Node has neither .next nor .conditionalNext, assume it's an end node
                graph.addEdge(nodeId, END);
            }
        }

        // Compile the graph
        this.compiledGraph = graph.compile();
    }

    /**
     * Converts the internal AgentGraphConfig to LangChain's RunnableConfig.
     */
    private convertConfigToRunnableConfig(config?: AgentGraphConfig): RunnableConfig {
        const runnableConfig: RunnableConfig = {
            configurable: {},
        };

        if (config) {
            // Copy known fields or all fields
            runnableConfig.configurable = { ...config };

            // Add tags if debug is enabled via config or instance setting
            const isDebug = config.debug ?? this.debug;
            if (isDebug) {
                runnableConfig.tags = [...(config.tags || []), 'debug'];
                // You might add specific LangSmith config here if needed
            }
        } else if (this.debug) {
            // Add debug tag if instance debug is on and no config provided
            runnableConfig.tags = ['debug'];
        }

        // Add other LangGraph specific config if needed, e.g., recursionLimit
        // runnableConfig.recursionLimit = config?.maxDepth || 100;

        return runnableConfig;
    }

    /**
     * Creates a runnable function that executes the compiled LangGraph.
     */
    public runnable(): (state: T, config?: AgentGraphConfig) => Promise<T> {
        return async (state: T, config?: AgentGraphConfig): Promise<T> => {
            const runnableConfig = this.convertConfigToRunnableConfig(config);

            if (this.debug || config?.debug) {
                console.log(`[LangGraph] Invoking compiled graph with config:`, JSON.stringify(runnableConfig));
            }

            // Invoke the compiled LangGraph
            // LangGraph handles the execution flow, state updates, and error handling internally
            const finalState = await this.compiledGraph.invoke(state, runnableConfig);
            return finalState;
        };
    }

    /**
     * Enables or disables debug mode.
     * Note: This primarily affects logging and config tagging for LangSmith.
     */
    public setDebug(enabled: boolean): void {
        this.debug = enabled;
        console.log(`[LangGraph] Debug mode set to: ${enabled}`);
    }
}

// --- Factory Implementation ---

/**
 * Factory implementation for creating LangGraphAgentGraph instances.
 */
export class LangGraphAgentGraphFactory implements AgentGraphFactory {
    public createAgentGraph<S extends AgentState<any, any, any>>(
        // Type assertion needed as the generic factory expects GraphDefinition
        graph: LangGraphDefinition<S>,
        startNodeId: string,
        taskService: ITaskService,
        providerService: IProviderService,
        modelService: IModelService,
        promptService: IPromptService,
    ): AgentGraphImplementation<S> {
        // Instantiate the LangGraphAgentGraph
        return new LangGraphAgentGraph<S>(
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
 * Helper function to create a new LangGraphAgentGraph instance.
 */
export function createLangGraphAgentGraph<S extends AgentState<any, any, any>>(
    graph: LangGraphDefinition<S>, // Expects the richer definition
    startNodeId: string,
    taskService: ITaskService,
    providerService: IProviderService,
    modelService: IModelService,
    promptService: IPromptService,
    factory: AgentGraphFactory = new LangGraphAgentGraphFactory(), // Use specific factory
): AgentGraphImplementation<S> {
    // Type assertion needed because AgentGraphFactory is generic
    return factory.createAgentGraph(
        graph as any, // Assert graph type compatibility
        startNodeId,
        taskService,
        providerService,
        modelService,
        promptService,
    );
}
