import { ConfigurationLoader } from '../configuration/configurationLoader.js';
import { ConfigurationService } from '../configuration/configurationService.js';
import { ConfigurationError, type ConfigLoaderOptions, type ValidationResult } from '../configuration/types.js';
import { TaskConfigurationError, TaskNotFoundError } from './errors.js';
import type { TaskConfig, TaskConfigFile } from './schemas/taskConfig.js';
import { TaskConfigFileSchema, TaskConfigSchema } from './schemas/taskConfig.js';
import type { ITaskConfigurationService } from './types.js';

/**
 * Task configuration options
 */
interface TaskConfigurationOptions extends Omit<ConfigLoaderOptions, 'basePath'> {
    /**
     * Path to the configuration file
     */
    readonly configPath: string;

    /**
     * Optional environment name
     */
    readonly environment?: string;

    /**
     * Optional debug flag
     */
    readonly debug?: boolean;

    /**
     * Optional base path
     */
    readonly basePath?: string;
}

/**
 * Service for loading and managing task configurations
 */
export class TaskConfigurationService extends ConfigurationService<TaskConfigFile> implements ITaskConfigurationService {
    /**
     * Configuration loader instance
     */
    private readonly loader: ConfigurationLoader;

    /**
     * Debug mode flag
     */
    private readonly debug: boolean;

    /**
     * Creates a new TaskConfigurationService
     * 
     * @param options - Configuration options
     */
    constructor(options: TaskConfigurationOptions) {
        super({ validateOnLoad: true });

        this.debug = options.debug ?? false;
        this.loader = new ConfigurationLoader({
            basePath: options.basePath ?? options.configPath,
            environment: options.environment,
            validateSchema: true
        });

        if (this.debug) {
            console.log('[TaskConfigurationService] Initialized with path:', options.configPath);
        }
    }

    /**
     * Load task configurations
     * 
     * @param configPath - Path to the configuration file
     * @returns Task configuration file
     * @throws {ConfigurationError} If configuration loading fails
     */
    loadConfig(configPath: string): TaskConfigFile {
        try {
            if (this.debug) {
                console.log(`[TaskConfigurationService] Loading configuration from: ${configPath}`);
            }

            const config = this.loader.loadConfig(
                configPath,
                {
                    schema: TaskConfigFileSchema,
                    required: true
                }
            ) as TaskConfigFile;

            const validationResult = this.validateConfig(config);
            if (!validationResult.isValid) {
                throw new TaskConfigurationError(
                    `Task configuration validation failed: ${validationResult.errors?.join(', ')}`,
                    validationResult.errors || []
                );
            }

            this.config = config;

            if (this.debug) {
                console.log(`[TaskConfigurationService] Loaded ${config.tasks.length} tasks`);
            }

            return config;
        } catch (error) {
            if (error instanceof TaskConfigurationError) {
                throw error;
            }

            throw new ConfigurationError({
                name: 'TaskConfigLoadError',
                message: `Failed to load task configurations: ${error instanceof Error ? error.message : String(error)}`,
                code: 'TASK_CONFIG_LOAD_ERROR'
            });
        }
    }

    /**
     * Get task configuration by name
     * 
     * @param taskName - Name of the task to retrieve
     * @returns Task configuration
     * @throws {TaskNotFoundError} If task is not found
     */
    getTaskConfig(taskName: string): TaskConfig {
        if (!this.config) {
            throw new ConfigurationError({
                name: 'TaskConfigNotLoadedError',
                message: 'Task configurations not loaded',
                code: 'TASK_CONFIG_NOT_LOADED'
            });
        }

        const task = this.config.tasks.find(task => task.taskName === taskName);
        if (!task) {
            throw new TaskNotFoundError(taskName);
        }

        return task;
    }

    /**
     * Get all task configurations
     * 
     * @returns Array of task configurations
     * @throws {ConfigurationError} If configurations are not loaded
     */
    getAllTaskConfigs(): ReadonlyArray<TaskConfig> {
        if (!this.config) {
            throw new ConfigurationError({
                name: 'TaskConfigNotLoadedError',
                message: 'Task configurations not loaded',
                code: 'TASK_CONFIG_NOT_LOADED'
            });
        }

        return [...this.config.tasks];
    }

    /**
     * Validate a task configuration
     * 
     * @param config - Task configuration to validate
     * @returns Validation result
     */
    validateTaskConfig(config: TaskConfig): ValidationResult {
        try {
            TaskConfigSchema.parse(config);
            return { isValid: true };
        } catch (error) {
            return {
                isValid: false,
                errors: [error instanceof Error ? error.message : String(error)]
            };
        }
    }

    /**
     * Validate configuration file
     * 
     * @param config - Configuration file to validate
     * @returns Validation result
     */
    protected validateConfig(config: TaskConfigFile): ValidationResult {
        try {
            TaskConfigFileSchema.parse(config);

            // Validate each task individually
            const taskErrors: string[] = [];
            config.tasks.forEach((task, index) => {
                const result = this.validateTaskConfig(task);
                if (!result.isValid && result.errors) {
                    taskErrors.push(`Task #${index + 1} (${task.taskName}): ${result.errors.join(', ')}`);
                }
            });

            if (taskErrors.length > 0) {
                return {
                    isValid: false,
                    errors: taskErrors
                };
            }

            return { isValid: true };
        } catch (error) {
            return {
                isValid: false,
                errors: [error instanceof Error ? error.message : String(error)]
            };
        }
    }
} 