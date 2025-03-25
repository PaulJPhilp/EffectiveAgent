import { writeFile } from "fs/promises";
import { join } from "path";
import { ConfigurationLoader } from "@services/configuration/index.js";
import { ModelService } from "@services/model/modelService.js";
import { PromptService } from "@services/prompt/promptService.js";
import { ProviderService } from "@services/provider/providerService.js";
import { TaskService } from "@services/task/taskService.js";
import type { AgentGraphConfig, AgentGraphImplementation } from "./AgentGraph.js";
import type { AgentConfig, AgentErrors, AgentLogs, AgentRun, AgentState } from "./types.js";

/**
 * Represents a condition for edge traversal
 */
export interface LangGraphCondition {
    field: string; // The state field to check
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin'; // Comparison operator
    value: unknown; // Value to compare against
}

/**
 * Represents an edge in the graph
 */
export interface LangGraphEdge {
    from: string;
    to: string;
    conditions?: LangGraphCondition[]; // Optional conditions that must be met to traverse this edge
}

/**
 * Configuration for a node in the graph
 */
export interface LangGraphNodeConfig {
    id: string;
    type: string;
    next: string[]; // Default next nodes if no conditions are met
    data?: Record<string, unknown>;
    conditions?: { // Optional conditional routing
        field: string; // The state field to check
        routes: { // Map of field values to next node IDs
            [key: string]: string[];
        };
        default?: string[]; // Default route if no conditions match
    };
}

/**
 * Complete LangGraph configuration
 */
export interface LangGraphConfig {
    nodes: LangGraphNodeConfig[];
    edges: LangGraphEdge[]; // Using the new edge type
    start_node_id: string;
    metadata?: {
        description?: string;
        version?: string;
        created?: string;
        updated?: string;
    };
}

export class Agent<I, O, A> {
    readonly config: AgentConfig;
    readonly agentRun: AgentRun;
    readonly state: AgentState<I, O, A>;
    private readonly configLoader: ConfigurationLoader;
    protected readonly taskService: TaskService;
    protected readonly providerService: ProviderService;
    protected readonly modelService: ModelService;
    protected readonly promptService: PromptService;

    constructor({ configPath }: { configPath: string }) {
        this.configLoader = new ConfigurationLoader({
            basePath: configPath,
            environment: process.env.NODE_ENV,
            validateSchema: true
        });
        this.config = this.configLoader.loadConfig('config.json') as AgentConfig;
        this.agentRun = this.initializeAgentRun(this.config);
        this.state = this.initializeState(this.config);

        // Initialize services
        this.taskService = new TaskService(this.config);
        this.providerService = new ProviderService(this.config);
        this.modelService = new ModelService(this.config);
        this.promptService = new PromptService(this.config);
    }

    private initializeErrors(): AgentErrors { return { errors: [], errorCount: 0 }; }

    private initializeLogs(): AgentLogs { return { logs: [], logCount: 0 }; }

    private initializeAgentRun(config: AgentConfig): AgentRun {
        return {
            runId: crypto.randomUUID(),
            startTime: new Date().toISOString(),
            outputDir: config.outputPath,
            inputDir: config.inputPath,
            description: config.description,
        };
    }

    /**
     * Creates an initial state object for a new persona generation run
     * @param config Agent configuration
     * @returns Initial state object
     */
    private initializeState(config: AgentConfig): AgentState<I, O, A> {
        return {
            config,
            agentRun: this.initializeAgentRun(config),
            status: {
                currentNode: '',
                nodeHistory: [],
                overallStatus: 'initializing'
            },
            logs: this.initializeLogs(),
            errors: this.initializeErrors(),
            input: {} as I,
            output: {} as O,
            agentState: {} as A,
        };
    }

    /**
     * Builds and executes the agent graph
     * @param input Initial input for the agent
     * @param config Optional configuration for the graph execution
     * @returns Final state after graph execution
     */
    public async run(input: I, config?: AgentGraphConfig): Promise<AgentState<I, O, A>> {
        try {
            // Build the graph with the nodes and edges
            const graph = this.buildGraph();

            // Create initial state with input
            const initialState: AgentState<I, O, A> = {
                ...this.state,
                input,
                status: {
                    ...this.state.status,
                    overallStatus: 'running' as const
                }
            };

            // Execute the graph
            const result = await graph.runnable()(initialState, config);
            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                ...this.state,
                status: {
                    ...this.state.status,
                    overallStatus: 'failed' as const
                },
                errors: {
                    errors: [errorMessage],
                    errorCount: 1
                }
            };
        }
    }

    /**
     * Builds the agent graph with nodes and edges
     * This method should be overridden by specific agent implementations
     * to define their own graph structure
     */
    protected buildGraph(): AgentGraphImplementation<AgentState<I, O, A>> {
        throw new Error('buildGraph must be implemented by the specific agent class');
    }

    /**
     * Generates LangGraph configuration for visualization and debugging
     * This method should be overridden by specific agent implementations
     * to provide their graph structure in LangGraph format
     */
    protected generateLangGraphConfig(): LangGraphConfig {
        throw new Error('generateLangGraphConfig must be implemented by the specific agent class');
    }

    /**
     * Saves the LangGraph configuration to a file
     * @param outputPath Optional path to save the config. Defaults to langgraph.json in the agent's output directory
     */
    public async saveLangGraphConfig(outputPath?: string): Promise<void> {
        try {
            const config = this.generateLangGraphConfig();
            // Add metadata
            config.metadata = {
                description: this.config.description,
                version: this.config.version,
                created: new Date().toISOString(),
                updated: new Date().toISOString()
            };
            const finalPath = outputPath || join(this.config.outputPath, 'langgraph.json');
            await writeFile(finalPath, JSON.stringify(config, null, 2));
        } catch (error) {
            console.error('Error saving LangGraph config:', error);
            throw error;
        }
    }
}

