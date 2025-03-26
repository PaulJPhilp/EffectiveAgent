import type {
    ModelCompletionOptions,
    ModelCompletionResponse
} from '@/types.ts';
import { ModelService } from '../model/modelService.js';
import { PromptService } from '../prompt/promptService.js';
import type { IProviderService } from '../provider/types.js';
import {
    TaskExecutionError,
    TaskModelError,
    TaskNotFoundError,
    TaskPromptError,
    TaskServiceError
} from './errors.js';
import { TaskConfigurationService } from './taskConfigurationService.js';
import type {
    ITaskService,
    TaskConfig,
    TaskExecutionOptions,
    TaskExecutionResult,
    TaskServiceConfig
} from './types.js';

/**
 * Service for managing and executing AI tasks
 */
export class TaskService implements ITaskService {
    /**
     * Configuration service for task management
     */
    private readonly configService: TaskConfigurationService;

    /**
     * Model service for AI model interaction
     */
    private readonly modelService: ModelService;

    /**
     * Prompt service for generating prompts
     */
    private readonly promptService: PromptService;

    /**
     * Available tasks
     */
    private readonly tasks: ReadonlyArray<TaskConfig>;

    /**
     * Debug mode flag
     */
    private readonly debug: boolean;

    /**
     * Creates a new TaskService
     * 
     * @param config - Service configuration
     * @param deps - Optional dependencies for testing
     */
    constructor(
        config: TaskServiceConfig,
        deps: {
            configService?: TaskConfigurationService;
            modelService?: ModelService;
            promptService?: PromptService;
            providerService: IProviderService;
        }
    ) {
        this.debug = config.debug ?? false;

        try {
            // Use provided dependencies or create new instances
            this.configService = deps?.configService || new TaskConfigurationService({
                configPath: config.configPath,
                basePath: config.configPath,
                environment: config.environment,
                debug: this.debug
            });

            // Load the task configurations with full path
            this.configService.loadConfig(config.configPath);
            this.tasks = this.configService.getAllTaskConfigs();

            // Initialize model and prompt services with shared config directory
            const sharedConfigDir = '/Users/paul/projects/pdf-loader/src/agents/config';
            this.modelService = deps?.modelService || new ModelService({
                configPath: `${sharedConfigDir}/models.json`,
                environment: config.environment,
                debug: this.debug
            }, deps.providerService);

            this.promptService = deps?.promptService || new PromptService({
                configPath: `${sharedConfigDir}/prompts.json`,
                environment: config.environment,
                debug: this.debug
            });

            if (this.debug) {
                console.log(`[TaskService] Initialized with ${this.tasks.length} tasks`);
            }
        } catch (error) {
            const message = `Failed to initialize TaskService: ${error instanceof Error ? error.message : String(error)}`;
            if (this.debug) {
                console.error(`[TaskService] ${message}`);
            }
            throw new TaskServiceError(message, error instanceof Error ? error : undefined);
        }
    }

    /**
     * Execute a task with the given options
     * 
     * @param taskName - Name of the task to execute
     * @param options - Task execution options
     * @returns Task execution result
     * @throws {TaskNotFoundError} If task is not found
     * @throws {TaskExecutionError} If task execution fails
     */
    public async executeTask(
        taskName: string,
        options: TaskExecutionOptions = {}
    ): Promise<TaskExecutionResult> {
        if (this.debug) {
            console.log(`[TaskService] Executing task: ${taskName}`);
        }

        try {
            // Get the task configuration
            const task = this.getTaskByName(taskName);

            // Check if prompt name is defined
            const promptName = task.promptName;
            if (!promptName) {
                throw new TaskExecutionError(
                    taskName,
                    'No prompt name defined for task'
                );
            }

            // Generate prompt from template
            let prompt: string;
            try {
                prompt = await this.promptService.generatePrompt(
                    { templateName: promptName },
                    options.variables ?? {}
                );
            } catch (error) {
                throw new TaskPromptError(
                    taskName,
                    promptName,
                    error instanceof Error ? error.message : String(error),
                    error instanceof Error ? error : undefined
                );
            }

            // Set up model completion options
            const completionOptions: ModelCompletionOptions = {
                prompt,
                modelId: task.primaryModelId,
                temperature: options.temperature ?? task.temperature,
                maxTokens: options.maxTokens ?? task.maxTokens,
                format: options.format
            };

            // Execute the model completion
            let response: ModelCompletionResponse;
            try {
                response = await this.modelService.generateText(completionOptions);
            } catch (error) {
                throw new TaskModelError(
                    taskName,
                    task.primaryModelId,
                    error instanceof Error ? error.message : String(error),
                    error instanceof Error ? error : undefined
                );
            }

            // Extract and format the result
            const result = this.extractResultFromResponse(response, options.format);

            return {
                taskName,
                result: typeof result === 'string' ? result : JSON.stringify(result),
                modelId: response.modelId,
                usage: response.usage,
                metadata: {}
            };
        } catch (error) {
            // Re-throw specific task errors
            if (
                error instanceof TaskNotFoundError ||
                error instanceof TaskPromptError ||
                error instanceof TaskModelError
            ) {
                throw error;
            }

            // Wrap other errors
            throw new TaskExecutionError(
                taskName,
                error instanceof Error ? error.message : String(error),
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Get all available tasks
     * 
     * @returns Array of task configurations
     */
    public getAvailableTasks(): ReadonlyArray<TaskConfig> {
        return this.tasks;
    }

    /**
     * Get task configuration by name
     * 
     * @param taskName - Name of the task to retrieve
     * @returns Task configuration
     * @throws {TaskNotFoundError} If task is not found
     */
    public getTaskByName(taskName: string): TaskConfig {
        const task = this.tasks.find(t => t.taskName === taskName);
        if (!task) {
            throw new TaskNotFoundError(taskName);
        }
        return task;
    }

    /**
     * Extract result from model response based on specified format
     * 
     * @param response - Model completion response
     * @param format - Desired output format
     * @returns Formatted result
     * @private
     */
    private extractResultFromResponse(
        response: ModelCompletionResponse,
        format: 'text' | 'json' | 'image' | 'embedding' = 'text'
    ): string | Record<string, unknown> | string[] | number[] {
        switch (format) {
            case 'json':
                return response.json ?? JSON.parse(response.text ?? '{}');
            case 'image':
                return response.image ?? '';
            case 'embedding':
                return response.embedding ?? [];
            case 'text':
            default:
                return response.text ?? '';
        }
    }
} 