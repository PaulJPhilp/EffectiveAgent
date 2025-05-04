import { ModelConfigurationService } from "@/services/ai/model/modelConfigurationService.js";
import { ModelConfigFileSchema } from "@/services/ai/model/schema.js";
import { ModelService } from "@/services/ai/model/service.js";
import type { ModelConfigFile, ModelConfigurationOptions } from "@/services/ai/model/types.js";
import { PromptService } from "@/services/ai/prompt/promptService.js";
import type { ProvidersFile } from "@/services/ai/provider/schema.js";
import { ProvidersFileSchema } from "@/services/ai/provider/schema.js";
import { ProviderConfigurationService, ProviderService } from "@/services/ai/provider/service.js";
import type { IProviderService } from "@/services/ai/provider/types.js";
import { ConfigurationLoader } from "@/services/core/configuration/index.js";
import type { TaskConfigFile } from "@/services/core/task/schema.js";
import { TaskConfigFileSchema } from "@/services/core/task/schema.js";
import { TaskService } from "@/services/core/task/service.js";
import type { JSONObject } from "@/types.js";
import fs from "fs";
import { join } from "path";
import { z } from "zod";
import type { AgentGraphConfig, AgentGraphImplementation } from "./AgentGraph.ts";
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
        if (this.debug) console.log('[Agent] initializeServices')
        // Initialize provider configuration service
        const providerConfigService = new ProviderConfigurationService({
            configPath: config.configFiles.providers,
            environment: process.env["NODE_ENV"]
        });

        const options: ModelConfigurationOptions = {
            configPath: config.configFiles.models,
            environment: process.env["NODE_ENV"],
            basePath: config.rootPath
        };
        const modelConfigService = new ModelConfigurationService(options);

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

    private loadConfigFile(path: string, schema: z.ZodType<any>): z.SafeParseReturnType<any, any> {
        if (this.debug) console.log(`loadConfigFile(${path})`)
        try {
            const content = fs.readFileSync(path, 'utf-8');
            const json = JSON.parse(content) as JSONObject
            const result = schema.safeParse(json);
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to load configuration file ${path}: ${message}`);
        }
    }

    /**
     * Validates a configuration file against its schema
     * @param path Path to the configuration file
     * @param schema Zod schema to validate against
     * @param name Name of the configuration for error messages
     * @throws Error if validation fails
     */
    private validateConfigSchema(path: string, schema: z.ZodType<any>, name: string): void {
        if (this.debug) console.log(`validateConfigSchema(${path})`)
        try {
            const result = this.loadConfigFile(path, schema);

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

        const modelConfig = this.loadConfigFile(this.getSharedConfigPath('models.json'), ModelConfigFileSchema).data as ModelConfigFile
        console.log("Model configuration:", Array.isArray(modelConfig.models) ? modelConfig.models.length : -1)
        if (modelConfig === undefined) {
            throw new Error('Model configuration not found')
        }
        const providerConfig = this.loadConfigFile(this.getSharedConfigPath('providers.json'), ProvidersFileSchema).data as ProvidersFile
        if (providerConfig === undefined) {
            throw new Error('Provider configuration not found')
        }
        const taskConfig = this.loadConfigFile(this.getAgentConfigPath('tasks.json'), TaskConfigFileSchema).data as TaskConfigFile
        if (!taskConfig) {
            throw new Error('Task configuration not found')
        }

        for (const model of modelConfig.models) {
            if (model.provider === undefined) {
                throw new Error(`Model ${model.name} is missing provider configuration`)
            }

            const providerName = model.provider.trim().toLowerCase()
            let providerFound = false
            for (const provider of providerConfig.providers) {
                if (providerName === provider.name.trim().toLowerCase()) {
                    providerFound = true
                    break
                }
            }
            if (!providerFound) {
                throw new Error(`Model ${model.name} is configured to use provider ${model.provider}, but provider ${model.provider} is not defined in providers.json`)
            }
        }

        for (const task of taskConfig.tasks) {
            if (task.primaryModelId === undefined) {
                throw new Error(`Task ${task.name} is missing primary model configuration`)
            }
            let taskModelFound = false
            for (const model of modelConfig.models) {
                if (task.primaryModelId.trim().toLowerCase() === model.id.trim().toLowerCase()) {
                    taskModelFound = true
                    break
                }
            }
            if (!taskModelFound) {
                throw new Error(`Task ${task.name} is configured to use model ${task.primaryModelId}, but model ${task.primaryModelId} is not defined in models.json`)
            }
        }
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
                fs.accessSync(file.path);
            } catch {
                missingFiles.push(`${file.name} file not found at: ${file.path}`);
            }
        }

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
            fs.writeFileSync(finalPath, JSON.stringify(config, null, 2));
        } catch (error) {
            console.error('Error saving LangGraph config:', error);
            throw error;
        }
    }
}

