import type { TaskModelMapping } from '../../schemas/taskConfig.js';
import type { ModelCompletionOptions } from '../provider/modelProvider.js';
import { ModelSelectionFactory } from '../model/modelSelectionFactory.js';
import { ModelService } from '../model/modelService.js';
import { PromptService } from '../prompt/promptService.js';
import { TaskRegistryService } from './taskRegistryService.js';
import type { TaskConfig } from '../../interfaces/task.js';

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
     * Execute a task with the given options
     */
    public async executeTask(
        taskName: string,
        input: string | Record<string, unknown>,
        options: TaskExecutionOptions = {}
    ): Promise<TaskExecutionResult> {
        // Get task configuration
        console.log(`[TaskService] Executing task: ${taskName}`);
        const taskConfig = await this.taskRegistry.getTaskConfig(taskName);
        if (!taskConfig) {
            throw new Error(`Task not found: ${taskName}`);
        }

        console.log(`[TaskService] Task config:`, JSON.stringify(taskConfig, null, 2));
        
        // Debug raw models
        const allModels = this.modelSelectionFactory.getAllModels();
        console.log(`[TaskService] All available models:`, 
            JSON.stringify(allModels.map(m => ({ 
                id: m.id, 
                contextWindowSize: m.contextWindowSize,
                thinkingLevel: m.thinkingLevel
            })), null, 2));

        // Generate prompt from template if available
        const prompt = typeof input === 'string'
            ? input
            : await this.promptService.generatePrompt(
                taskName, 
                input as Record<string, string>, 
                options
            );

        console.log(`[TaskService] Selecting model with requirements:`, 
            JSON.stringify({
                contextWindowSize: taskConfig.contextWindowSize,
                thinkingLevel: taskConfig.thinkingLevel,
                preferredModelId: taskConfig.primaryModelId
            }, null, 2)
        );

        try {
            // Skip model selection and directly use the primary model ID
            console.log(`[TaskService] Directly using primary model: ${taskConfig.primaryModelId}`);
            
            // Execute the task using the primary model
            const completionOptions: ModelCompletionOptions = {
                prompt,
                systemPrompt: options.systemPrompt,
                temperature: options.temperature ?? taskConfig.temperature,
                maxTokens: options.maxTokens
            };

            const response = await this.modelService.completeWithModel(
                taskConfig.primaryModelId,
                completionOptions
            );

            return {
                taskName,
                result: response.text,
                modelId: response.modelId,
                usage: response.usage
            };
        } catch (error) {
            console.error(`[TaskService] Error selecting or using model:`, error);
            throw new Error(`Error executing task ${taskName}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get all available tasks
     */
    public async getAvailableTasks(): Promise<TaskConfig[]> {
        return this.taskRegistry.getAllTaskConfigs();
    }

    /**
     * Get task configuration by name
     */
    public async getTaskConfig(taskName: string): Promise<TaskConfig | undefined> {
        return this.taskRegistry.getTaskConfig(taskName);
    }
} 