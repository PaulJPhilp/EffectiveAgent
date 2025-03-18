
import type { ModelCompletionOptions } from '../provider/modelProvider.js';
import { ModelSelectionFactory } from '../model/modelSelectionFactory.js';
import { ModelService } from '../model/modelService.js';
import { PromptService } from '../prompt/promptService.js';
import { TaskRegistryService } from './taskRegistryService.js';
import type { TaskDefinition } from './schemas/taskConfig.js';
import * as fs from 'fs';
import { join } from 'path';

type Task = TaskDefinition;

/**
 * Options for task execution
 */
export interface TaskExecutionOptions {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    variables?: Record<string, string>;
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

/**
 * Service for managing and executing tasks
 */
export class TaskService {
    private readonly modelService: ModelService;
    private readonly modelSelectionFactory: ModelSelectionFactory;
    private readonly promptService: PromptService;
    private readonly taskRegistry: TaskRegistryService;
    private readonly configPath: string = '';
    private readonly config: { tasks: Task[] };

    constructor(options: TaskServiceOptions) {
        console.log(`[TaskService] Initializing with config path: ${options.configPath}`);
        this.modelService = new ModelService({ configPath: options.configPath });
        this.modelSelectionFactory = new ModelSelectionFactory({ modelsConfigPath: options.configPath });
        this.promptService = new PromptService({ configPath: options.configPath });
        this.taskRegistry = new TaskRegistryService({ tasksConfigPath: options.configPath });
        this.configPath = options.configPath;
        this.config = this.loadConfig();
    }

    private loadConfig(): { tasks: Task[] } {
        console.log(`[TaskService] Loading config from ${join(this.configPath, 'tasks.json')}`);
        const config = fs.readFileSync(join(this.configPath, 'tasks.json'), 'utf-8');
        return JSON.parse(config) as { tasks: Task[] };
    }

    /**
     * Execute a task with the given options
     */
    public async executeTask(
        taskName: string,
        options: TaskExecutionOptions = {}
    ): Promise<TaskExecutionResult> {
        console.log(`[TaskService] Executing task: ${taskName}`);
        try {
            const task = this.config.tasks.find(t => t.taskName === taskName);
            if (!task) {
                throw new Error(`Task not found: ${taskName}`);
            }
            const promptName = task.promptName;

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
                maxTokens: options.maxTokens
            };

            if (task.thinkingLevel) {
                completionOptions.thinkingLevel = task.thinkingLevel;
            }

            const response = await this.modelService.completeWithModel(
                { modelId: task.primaryModelId },
                completionOptions
            );

            return {
                taskName,
                result: response.text,
                modelId: response.modelId,
                usage: response.usage,
                metadata: {}
            };
        } catch (error) {
            console.error(`[TaskService] Error selecting or using model:`, error);
            throw new Error(`Error executing task ${taskName}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get all available tasks
     */
    public async getAvailableTasks(): Promise<Task[]> {
        return this.taskRegistry.getAllTaskConfigs();
    }

    /**
     * Get task configuration by name
     */
    /**
     * Get task by name
     * @throws {Error} If task not found
     */
    public async getTaskByName(taskName: string): Promise<Task> {
        const task = await this.taskRegistry.getTaskConfig(taskName);
        if (!task) {
            throw new Error(`Task not found: ${taskName}`);
        }
        return task;
    }
} 