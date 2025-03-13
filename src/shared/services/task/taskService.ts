import type { TaskModelMapping } from '../../schemas/taskConfig.js';
import type { ModelCompletionOptions } from '../model/modelProvider.js';
import { ModelSelectionFactory } from '../model/modelSelectionFactory.js';
import { ModelService } from '../model/modelService.js';
import { PromptService } from '../prompt/promptService.js';
import { TaskRegistryService } from './taskRegistryService.js';

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
 * Service for managing and executing tasks
 */
export class TaskService {
    private static instance: TaskService;
    private modelService: ModelService;
    private modelSelectionFactory: ModelSelectionFactory;
    private promptService: PromptService;
    private taskRegistry: TaskRegistryService;

    private constructor(
        modelService: ModelService,
        modelSelectionFactory: ModelSelectionFactory,
        promptService: PromptService,
        taskRegistry: TaskRegistryService
    ) {
        this.modelService = modelService;
        this.modelSelectionFactory = modelSelectionFactory;
        this.promptService = promptService;
        this.taskRegistry = taskRegistry;
    }

    /**
     * Get singleton instance of TaskService
     */
    public static async getInstance(): Promise<TaskService> {
        if (!TaskService.instance) {
            const [modelService, modelSelectionFactory, promptService, taskRegistry] = await Promise.all([
                ModelService.getInstance(),
                ModelSelectionFactory.getInstance(),
                PromptService.getInstance(),
                TaskRegistryService.getInstance()
            ]);
            TaskService.instance = new TaskService(modelService, modelSelectionFactory, promptService, taskRegistry);
        }
        return TaskService.instance;
    }

    /**
     * Execute a task with the given options
     */
    public async executeTask(
        taskName: string,
        input: string | Record<string, unknown>,
        options: TaskExecutionOptions = {}
    ): Promise<TaskExecutionResult> {
        // Get task configuration
        const taskConfig = await this.taskRegistry.getTaskConfig(taskName);
        if (!taskConfig) {
            throw new Error(`Task not found: ${taskName}`);
        }

        // Generate prompt from template if available
        const prompt = typeof input === 'string'
            ? input
            : await this.promptService.generatePrompt(taskName, input as Record<string, string>, options);

        // Select model based on task requirements
        const modelSelection = this.modelSelectionFactory.selectModel({
            capabilities: taskConfig.requiredCapabilities,
            contextWindowSize: taskConfig.contextWindowSize,
            thinkingLevel: taskConfig.thinkingLevel,
            temperature: options.temperature ?? taskConfig.temperature,
            preferredModelId: taskConfig.primaryModelId
        });

        // Execute the task using the selected model
        const completionOptions: ModelCompletionOptions = {
            prompt,
            systemPrompt: options.systemPrompt,
            temperature: modelSelection.temperature,
            maxTokens: options.maxTokens
        };

        const response = await this.modelService.completeWithModel(
            modelSelection.model.id,
            completionOptions
        );

        return {
            taskName,
            result: response.text,
            modelId: response.modelId,
            usage: response.usage
        };
    }

    /**
     * Get all available tasks
     */
    public async getAvailableTasks(): Promise<TaskModelMapping[]> {
        return this.taskRegistry.getAllTaskMappings();
    }

    /**
     * Get task configuration by name
     */
    public async getTaskConfig(taskName: string): Promise<TaskModelMapping | undefined> {
        return this.taskRegistry.getTaskConfig(taskName);
    }
} 