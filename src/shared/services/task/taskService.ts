import type { AgentConfig } from '../../../../agents/agent-service/types.js';
import { ModelSelectionFactory } from '../model/modelSelectionFactory.js';
import { ModelService } from '../model/modelService.js';
import { PromptService } from '../prompt/promptService.js';
import type { ModelCompletionOptions, ModelCompletionResponse } from '../provider/modelProvider.js';
import { type Task } from './schemas/taskSchemas.js';
import { TaskConfigurationService } from './taskConfigurationService.js';
import { TaskRegistryService } from './taskRegistryService.js';

/**
 * Options for task execution
 */
export interface TaskExecutionOptions {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    variables?: Record<string, string>;
    format?: "text" | "json" | "image" | "embedding";
}

/**
 * Result of task execution
 */
export interface TaskExecutionResult {
    metadata: any;
    taskName: string;
    result: string;
    modelId?: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

/**
 * Service options for TaskService
 */
export interface TaskServiceOptions {
    readonly configPath: string;
}

/** Service for managing and executing tasks */
export class TaskService {
    readonly debug: boolean = false;
    private tasks: ReadonlyArray<Task>;
    private readonly modelService: ModelService;
    private readonly modelSelectionFactory: ModelSelectionFactory;
    private readonly promptService: PromptService;
    private readonly taskRegistry: TaskRegistryService;
    private readonly taskConfigurationService: TaskConfigurationService;
    constructor(agentConfig: AgentConfig) {
        this.taskConfigurationService = new TaskConfigurationService({
            configPath: agentConfig.rootPath,
            environment: agentConfig.environment
        });
        this.tasks = this.taskConfigurationService.getAllTaskConfigs();

        this.modelService = new ModelService(agentConfig);
        this.modelSelectionFactory = new ModelSelectionFactory(agentConfig);
        this.promptService = new PromptService(agentConfig);
        this.taskRegistry = new TaskRegistryService(agentConfig);
    }

    /** Execute a task with the given options */
    public async executeTask(
        taskName: string,
        options: TaskExecutionOptions = {}
    ): Promise<TaskExecutionResult> {
        if (this.debug) {
            console.log(`[TaskService] Executing task: ${taskName}`);
        }
        try {
            const task = await this.getTaskByName(taskName);
            if (!task) {
                throw new Error(`Task not found: ${taskName}`);
            }
            const promptName = task.promptName;
            if (!promptName) {
                throw new Error(`No prompt name defined for task: ${taskName}`);
            }

            // Generate prompt from template if available
            const prompt = await this.promptService.generatePrompt(
                { templateName: promptName },
                options.variables ?? {},
                options
            );

            const completionOptions: ModelCompletionOptions = {
                prompt,
                systemPrompt: options.systemPrompt,
                temperature: options.temperature ?? task.temperature,
                maxTokens: options.maxTokens,
                format: options.format
            };

            const response = await this.modelService.completeWithModel(
                { modelId: task.primaryModelId },
                completionOptions
            );

            const result = this.extractResultFromResponse(response, options.format);
            return {
                taskName,
                result: typeof result === 'string' ? result : JSON.stringify(result),
                modelId: response.modelId,
                usage: response.usage,
                metadata: {}
            };
        } catch (error) {
            if (this.debug) {
                console.error(`[TaskService] Error selecting or using model:`, error);
            }
            throw new Error(`Error executing task ${taskName}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /** Get task configuration by name */
    public getTaskByName(taskName: string): Task {
        const task = this.tasks.find(t => t.taskName === taskName);
        if (!task) {
            throw new Error(`Task not found: ${taskName}`);
        }
        return task;
    }

    /** Get all available tasks */
    public getAvailableTasks(): ReadonlyArray<Task> {
        return this.tasks;
    }

    /** Extract result from model response based on specified format */
    private extractResultFromResponse(response: ModelCompletionResponse, format: 'text' | 'json' | 'image' | 'embedding' = 'text'): string | Record<string, unknown> | string[] | number[] {
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