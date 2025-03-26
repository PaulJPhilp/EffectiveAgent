import type { RunnableConfig } from '@langchain/core/runnables'
import type { IModelService } from '@services/model/types.js'
import type { IPromptService } from '@services/prompt/types.js'
import type { IProviderService } from '@services/provider/types.js'
import type { ITaskService } from '@services/task/types.js'
import type { AgentNode } from './AgentNode.js'
import type { AgentState } from './types.js'

interface GraphNode<T extends AgentState<any, any, any>> {
    node: AgentNode<T>
    next: Array<string>
}

interface GraphDefinition<T extends AgentState<any, any, any>> {
    [key: string]: GraphNode<T>
}

/**
 * Configuration object for agent graph execution
 */
export interface AgentGraphConfig {
    readonly debug?: boolean
    readonly maxRetries?: number
    readonly timeout?: number
    readonly [key: string]: any
}

/**
 * Interface for AgentGraph implementations
 */
export interface AgentGraphImplementation<T extends AgentState<any, any, any>> {
    /**
     * Creates a runnable function that executes the entire graph
     */
    runnable(): (state: T, config?: AgentGraphConfig) => Promise<T>

    /**
     * Enables debug mode for detailed logging
     */
    setDebug(enabled: boolean): void
}

/**
 * Service for managing agent execution graphs
 */
export class AgentGraph<T extends AgentState<any, any, any>> implements AgentGraphImplementation<T> {
    private readonly graph: GraphDefinition<T>
    private readonly startNode: string
    protected readonly taskService: ITaskService
    protected readonly providerService: IProviderService
    protected readonly modelService: IModelService
    protected readonly promptService: IPromptService
    protected debug: boolean = false

    constructor(
        graph: GraphDefinition<T>,
        startNode: string,
        taskService: ITaskService,
        providerService: IProviderService,
        modelService: IModelService,
        promptService: IPromptService
    ) {
        this.validateGraph(graph, startNode)
        this.graph = graph
        this.startNode = startNode
        this.taskService = taskService
        this.providerService = providerService
        this.modelService = modelService
        this.promptService = promptService
    }

    /**
     * Validates the graph structure and ensures it's properly connected
     */
    private validateGraph(graph: GraphDefinition<T>, startNode: string): void {
        if (!graph[startNode]) {
            throw new Error(`Start node "${startNode}" not found in graph`)
        }

        const visited = new Set<string>()
        const queue: string[] = [startNode]

        while (queue.length > 0) {
            const currentNode = queue.shift()!
            if (!visited.has(currentNode)) {
                visited.add(currentNode)
                const node = graph[currentNode]
                if (!node) {
                    throw new Error(`Node "${currentNode}" referenced but not defined in graph`)
                }
                // Add next nodes to queue, ignoring special 'END' node
                node.next.forEach(nextNode => {
                    if (nextNode !== 'END') {
                        queue.push(nextNode)
                    }
                })
            }
        }

        // Check for unreachable nodes
        Object.keys(graph).forEach(nodeId => {
            if (!visited.has(nodeId)) {
                throw new Error(`Node "${nodeId}" is unreachable from start node`)
            }
        })
    }

    /**
     * Converts AgentGraphConfig to LangChain RunnableConfig if needed
     */
    private convertConfigToRunnableConfig(config?: AgentGraphConfig): RunnableConfig | undefined {
        if (!config) return undefined

        // Create a compatible RunnableConfig
        return {
            configurable: {
                ...config
            }
        }
    }

    /**
     * Creates a runnable function that executes the entire graph
     */
    public runnable(): (state: T, config?: AgentGraphConfig) => Promise<T> {
        return async (state: T, config?: AgentGraphConfig): Promise<T> => {
            const startTime = new Date().toISOString()
            const runId = crypto.randomUUID()

            // Apply config overrides if provided
            const debugEnabled = config?.debug !== undefined ? config.debug : this.debug

            const agentRun = {
                ...state.agentRun,
                runId,
                startTime,
                description: 'Executing agent graph',
                completedSteps: []
            }

            try {
                if (debugEnabled) {
                    console.log(`[AgentGraph] Starting graph execution with run ${runId}`)
                }

                let currentState = {
                    ...state,
                    agentRun,
                    logs: {
                        ...state.logs,
                        logs: [...state.logs.logs, 'Starting graph execution'],
                        logCount: state.logs.logCount + 1
                    }
                } as T

                let currentNodeId = this.startNode

                while (currentNodeId) {
                    const graphNode = this.graph[currentNodeId]
                    // Convert our config to RunnableConfig for internal nodes if needed
                    const runnableConfig = this.convertConfigToRunnableConfig(config)
                    currentState = await graphNode.node.runnable()(currentState, runnableConfig) as T

                    if (currentState.status.overallStatus === 'failed') {
                        break
                    }

                    // Determine next node based on graph structure
                    const nextNodeId = graphNode.next[0] // For now, just take the first next node

                    // If next node is END, break the loop
                    if (nextNodeId === 'END') {
                        break
                    }

                    currentNodeId = nextNodeId
                }

                if (debugEnabled) {
                    console.log(`[AgentGraph] Completed graph execution for run ${runId}`)
                }

                return currentState

            } catch (error) {
                console.error(`[AgentGraph] Error in run ${runId}:`, error)
                const errorMessage = error instanceof Error ? error.message : String(error)

                return {
                    ...state,
                    agentRun,
                    status: 'failed',
                    errors: {
                        ...state.errors,
                        errors: [...state.errors.errors, errorMessage],
                        errorCount: state.errors.errorCount + 1
                    },
                    logs: {
                        ...state.logs,
                        logs: [...state.logs.logs, `Error in graph execution: ${errorMessage}`],
                        logCount: state.logs.logCount + 1
                    }
                }
            }
        }
    }

    /**
     * Enables debug mode for detailed logging
     */
    public setDebug(enabled: boolean): void {
        this.debug = enabled
    }
}

/**
 * Factory interface for creating AgentGraph implementations
 */
export interface AgentGraphFactory {
    /**
     * Creates an AgentGraph implementation
     */
    createAgentGraph<T extends AgentState<any, any, any>>(
        graph: GraphDefinition<T>,
        startNode: string,
        taskService: ITaskService,
        providerService: IProviderService,
        modelService: IModelService,
        promptService: IPromptService
    ): AgentGraphImplementation<T>
}

/**
 * Default AgentGraph factory implementation
 */
export class DefaultAgentGraphFactory implements AgentGraphFactory {
    public createAgentGraph<T extends AgentState<any, any, any>>(
        graph: GraphDefinition<T>,
        startNode: string,
        taskService: ITaskService,
        providerService: IProviderService,
        modelService: IModelService,
        promptService: IPromptService
    ): AgentGraphImplementation<T> {
        return new AgentGraph<T>(
            graph,
            startNode,
            taskService,
            providerService,
            modelService,
            promptService
        )
    }
}

/**
 * Create a new AgentGraph instance with dependency injection
 */
export function createAgentGraph<T extends AgentState<any, any, any>>(
    graph: GraphDefinition<T>,
    startNode: string,
    taskService: ITaskService,
    providerService: IProviderService,
    modelService: IModelService,
    promptService: IPromptService,
    factory: AgentGraphFactory = new DefaultAgentGraphFactory()
): AgentGraphImplementation<T> {
    return factory.createAgentGraph(
        graph,
        startNode,
        taskService,
        providerService,
        modelService,
        promptService
    )
} 