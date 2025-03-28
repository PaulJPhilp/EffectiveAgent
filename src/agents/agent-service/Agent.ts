import { ConfigurationLoader } from "@services/configuration/index.js";
import { ModelService } from "@services/model/modelService.js";
import { ModelConfigFileSchema } from "@services/model/schemas/modelConfig.js";
import { PromptService } from "@services/prompt/promptService.js";
import { PromptConfigFileSchema } from "@services/prompt/schemas/promptConfig.js";
import { ProviderConfigurationService } from "@services/provider/providerConfigurationService.js";
import { ProviderService } from "@services/provider/providerService.js";
import { ProvidersFileSchema } from "@services/provider/schemas/providerConfig.js";
import type { IProviderService } from "@services/provider/types.js";
import { TaskConfigFileSchema } from "@services/task/schemas/taskConfig.js";
import { TaskService } from "@services/task/taskService.js";
import { accessSync, readFileSync } from "fs";
import { writeFile } from "fs/promises";
import { join } from "path";
import { z } from "zod";
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
    protected debug: boolean = false
    private agentName: string = ""
    readonly config: AgentConfig;
    readonly agentRun: AgentRun;
    readonly state: AgentState<I, O, A>;
    protected readonly taskService: TaskService;
    protected readonly providerService: IProviderService;
    protected readonly modelService: ModelService;
    protected readonly promptService: PromptService;

    protected getRootDirectory(): string {
        return join(process.cwd(), 'src', 'agents');
    }

    /**
     * Gets the path to a shared configuration file
     * @param filename Name of the shared configuration file
     * @returns The absolute path to the shared configuration file
     */
    protected getSharedConfigPath(filename: string): string {
        if (this.debug) console.log(`getSharedConfigPath(${filename})`)
        return join(this.getRootDirectory(), 'config', filename);
    }

    /**
     * Gets the path to an agent-specific configuration file
     * @param filename Name of the configuration file
     * @returns The absolute path to the agent-specific configuration file
     */
    protected getAgentConfigPath(fileName: string): string {
        if (this.debug) console.log(`getAgentConfigPath(${fileName})`)
        return join(this.getRootDirectory(), this.agentName, 'config', fileName)
    }

    /**
     * Initializes all required services with correct configuration paths
     * @param config Agent configuration
     * @returns Object containing initialized services
     */
    protected initializeServices(config: AgentConfig): {
        providerService: IProviderService;
        modelService: ModelService;
        promptService: PromptService;
        taskService: TaskService;
    } {
        // Initialize provider configuration service
        const providerConfigService = new ProviderConfigurationService({
            configPath: config.configFiles.providers,
            environment: process.env["NODE_ENV"]
        });

        const modelConfigService = {
            getModel: (id: string) => ({ id, provider: 'openai' }),
            getDefaultModel: () => ({ id: 'default-model', provider: 'openai' })
        };

        // Initialize provider service
        const providerService = new ProviderService(
            config,
            providerConfigService,
            modelConfigService
        );

        // Initialize model service with shared config
        const modelService = new ModelService({
            configPath: this.getSharedConfigPath('models.json'),
            environment: process.env["NODE_ENV"],
            debug: config.debug
        }, providerService);

        // Initialize prompt service with agent-specific config
        const promptService = new PromptService({
            configPath: this.getAgentConfigPath('prompts.json'),
            environment: process.env["NODE_ENV"],
            debug: config.debug
        });

        // Initialize task service with agent-specific config
        const taskService = new TaskService({
            configPath: this.getAgentConfigPath('tasks.json'),
            environment: process.env["NODE_ENV"],
            debug: config.debug
        }, {
            providerService,
            promptService
        });

        return {
            providerService,
            modelService,
            promptService,
            taskService
        };
    }

    /**
     * Validates a configuration file against its schema
     * @param path Path to the configuration file
     * @param schema Zod schema to validate against
     * @param name Name of the configuration for error messages
     * @throws Error if validation fails
     */
    private validateConfigSchema(path: string, schema: z.ZodType<any>, name: string): void {
        console.log(`validateConfigSchema(${path})`)
        try {
            const content = readFileSync(path, 'utf-8');
            const json = JSON.parse(content);
            const result = schema.safeParse(json);

            if (!result.success) {
                const errors = result.error.errors.map(err =>
                    `  - ${err.path.join('.')}: ${err.message}`
                ).join('\n');

                throw new Error(
                    `Schema validation failed for ${name}:\n${errors}\n` +
                    `File: ${path}`
                );
            }
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error(
                    `Invalid JSON in ${name} file:\n` +
                    `  ${error.message}\n` +
                    `File: ${path}`
                );
            }
            throw error;
        }
    }

    /**
     * Validates all configuration files against their schemas
     * @throws Error if any validation fails
     */
    private validateConfigSchemas(): void {
        const schemasToValidate = [
            // Shared configuration files
            {
                path: this.getSharedConfigPath('providers.json'),
                schema: ProvidersFileSchema,
                name: 'Providers configuration'
            },
            {
                path: this.getSharedConfigPath('models.json'),
                schema: ModelConfigFileSchema,
                name: 'Models configuration'
            },
            // Agent-specific configuration files
            {
                path: this.getAgentConfigPath('prompts.json'),
                schema: PromptConfigFileSchema,
                name: 'Prompts configuration'
            },
            {
                path: this.getAgentConfigPath('tasks.json'),
                schema: TaskConfigFileSchema,
                name: 'Tasks configuration'
            }
        ];

        for (const { path, schema, name } of schemasToValidate) {
            this.validateConfigSchema(path, schema, name);
        }
        console.log(`FINISHED`)
    }

    /**
     * Validates that all required configuration files exist
     * @throws Error if any required configuration file is missing
     */
    private validateConfigFiles(): void {
        const filesToCheck = [
            // Shared configuration files
            {
                path: this.getSharedConfigPath('providers.json'),
                name: 'Providers configuration'
            },
            {
                path: this.getSharedConfigPath('models.json'),
                name: 'Models configuration'
            },
            // Agent-specific configuration files
            {
                path: this.getAgentConfigPath('prompts.json'),
                name: 'Prompts configuration'
            },
            {
                path: this.getAgentConfigPath('tasks.json'),
                name: 'Tasks configuration'
            }
        ];

        const missingFiles: string[] = [];

        for (const file of filesToCheck) {
            try {
                accessSync(file.path);
                console.log('Successfully found.')
            } catch {
                missingFiles.push(`${file.name} file not found at: ${file.path}`);
            }
        }

        console.log(missingFiles)
        if (missingFiles.length > 0) {
            throw new Error(
                'Missing required configuration files:\n' +
                missingFiles.map(msg => `- ${msg}`).join('\n')
            );
        }
    }

    /**
     * Creates a new Agent instance
     * @param configPath Path to the agent's configuration directory
     */
    constructor(agentName: string) {
        if (this.debug) console.log(`[Agent] Constructor(${agentName})`)
        this.agentName = agentName
        // Get the agent root directory
        const agentRoot = join(this.getRootDirectory(), this.agentName)
        if (this.debug) {
            console.log(`[Agent]: Constructor(${agentRoot})`)
            this.validateConfigFiles()
            this.validateConfigSchemas()
        }

        // Load agent configuration first
        const agentConfigLoader = new ConfigurationLoader({
            basePath: join(agentRoot, 'config'),
            environment: process.env["NODE_ENV"],
            validateSchema: true
        })

        this.config = agentConfigLoader.loadConfig('config.json') as AgentConfig
        // Initialize agent run and state
        this.agentRun = this.initializeAgentRun(this.config)
        this.state = this.initializeState(this.config)

        // Initialize all services with correct paths
        const services = this.initializeServices(this.config)
        this.providerService = services.providerService
        this.modelService = services.modelService
        this.promptService = services.promptService
        this.taskService = services.taskService
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
                overallStatus: 'running'
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
                    overallStatus: 'error',
                    nodeHistory: [
                        ...this.state.status.nodeHistory,
                        {
                            nodeId: 'agent',
                            status: 'error',
                            error: errorMessage,
                            timestamp: new Date().toISOString()
                        }
                    ]
                },
                errors: {
                    errors: [...this.state.errors.errors, errorMessage],
                    errorCount: this.state.errors.errorCount + 1
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

