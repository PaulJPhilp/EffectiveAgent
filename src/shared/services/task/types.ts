import type { ValidationResult } from '../configuration/types.js';
import type { TaskConfig, TaskConfigFile } from './schemas/taskConfig.js';
import type { ModelCompletionFormat, ModelCompletionUsage, JSONObject } from '@/types.ts';
// Export schema types
export type { TaskConfig, TaskConfigFile };

/**
 * Configuration for the task service
 */
export interface TaskServiceConfig {
    /**
     * Path to the task configuration file
     */
    readonly configPath: string;

    /**
     * Optional environment name (development, production, etc.)
     */
    readonly environment?: string;

    /**
     * Optional debug flag to enable detailed logging
     */
    readonly debug?: boolean;
}

/**
 * Options for task execution
 */
export interface TaskExecutionOptions {
    /**
     * Optional temperature override for task execution
     * Value between 0 and 1
     */
    temperature?: number;

    /**
     * Optional max tokens override for task execution
     */
    maxTokens?: number;

    /**
     * Optional system prompt override
     */
    systemPrompt?: string;

    /**
     * Optional variables to use in prompt template
     */
    variables?: Record<string, string>;

    /**
     * Optional output format
     */
    format?: ModelCompletionFormat;
}

/**
 * Result of task execution
 */
export interface TaskExecutionResult {
    /**
     * Name of the executed task
     */
    taskName: string;

    /**
     * Result of the task execution as a string
     */
    result: string;

    /**
     * ID of the model used for execution
     */
    modelId?: string;

    /**
     * Token usage statistics
     */
    usage?: ModelCompletionUsage;

    /**
     * Additional metadata about the execution
     */
    metadata: JSONObject;
}

/**
 * Interface for the task configuration service
 */
export interface ITaskConfigurationService {
    /**
     * Load task configuration
     * @param configPath Path to the configuration file
     */
    loadConfig(configPath: string): TaskConfigFile;

    /**
     * Get task configuration by name
     * @param taskName Name of the task to retrieve
     */
    getTaskConfig(taskName: string): TaskConfig;

    /**
     * Get all task configurations
     */
    getAllTaskConfigs(): ReadonlyArray<TaskConfig>;

    /**
     * Validate task configuration
     * @param config Task configuration to validate
     */
    validateTaskConfig(config: TaskConfig): ValidationResult;
}

/**
 * Interface for the task service
 */
export interface ITaskService {
    /**
     * Execute a task with the given options
     * @param taskName Name of the task to execute
     * @param options Task execution options
     */
    executeTask(taskName: string, options?: TaskExecutionOptions): Promise<TaskExecutionResult>;

    /**
     * Get all available tasks
     */
    getAvailableTasks(): ReadonlyArray<TaskConfig>;

    /**
     * Get task configuration by name
     * @param taskName Name of the task to retrieve
     */
    getTaskByName(taskName: string): TaskConfig;
} 