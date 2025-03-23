import { z } from 'zod';
import { 
    ConfigurationLoader, 
    ConfigurationError 
} from '../configuration';
import { TaskSchema } from '../configuration/schemas/taskSchemas';

/** Task configuration options */
interface TaskConfigurationOptions {
    readonly configPath: string;
    readonly environment?: string;
}

/** Task group schema */
const TaskGroupSchema = z.object({
    name: z.string(),
    description: z.string(),
    tasks: z.record(z.string(), TaskSchema)
});

/** Tasks configuration schema */
const TasksConfigSchema = z.object({
    name: z.string().describe("Configuration name"),
    version: z.string().describe("Configuration version"),
    updated: z.string().describe("Last update timestamp"),
    groups: z.record(z.string(), TaskGroupSchema).describe("Task groups")
});

/** Task configuration service */
export class TaskConfigurationService {
    private readonly loader: ConfigurationLoader;
    private tasksConfig?: z.infer<typeof TasksConfigSchema>;

    constructor(options: TaskConfigurationOptions) {
        this.loader = new ConfigurationLoader({
            basePath: options.configPath,
            environment: options.environment,
            validateSchema: true
        });
    }

    /** Load task configurations */
    async loadConfigurations(): Promise<void> {
        try {
            this.tasksConfig = await this.loader.loadConfig(
                'tasks.json',
                {
                    schema: TasksConfigSchema,
                    required: true
                }
            );
        } catch (error) {
            throw new ConfigurationError({
                name: 'TaskConfigLoadError',
                message: `Failed to load task configurations: ${error.message}`,
                code: 'TASK_CONFIG_LOAD_ERROR'
            });
        }
    }

    /** Get task configuration by ID */
    getTaskConfig(taskId: string): z.infer<typeof TaskSchema> {
        if (!this.tasksConfig) {
            throw new ConfigurationError({
                name: 'TaskConfigNotLoadedError',
                message: 'Task configurations not loaded',
                code: 'TASK_CONFIG_NOT_LOADED'
            });
        }

        for (const group of Object.values(this.tasksConfig.groups)) {
            const task = group.tasks[taskId];
            if (task) { return task; }
        }

        throw new ConfigurationError({
            name: 'TaskNotFoundError',
            message: `Task not found: ${taskId}`,
            code: 'TASK_NOT_FOUND'
        });
    }

    /** Get tasks by model ID */
    getTasksByModel(
        modelId: string
    ): ReadonlyArray<z.infer<typeof TaskSchema>> {
        if (!this.tasksConfig) {
            throw new ConfigurationError({
                name: 'TaskConfigNotLoadedError',
                message: 'Task configurations not loaded',
                code: 'TASK_CONFIG_NOT_LOADED'
            });
        }

        return Object.values(this.tasksConfig.groups)
            .flatMap(group => Object.values(group.tasks))
            .filter(task => task.model === modelId);
    }

    /** Get tasks by group */
    getTasksByGroup(
        groupId: string
    ): ReadonlyArray<z.infer<typeof TaskSchema>> {
        if (!this.tasksConfig) {
            throw new ConfigurationError({
                name: 'TaskConfigNotLoadedError',
                message: 'Task configurations not loaded',
                code: 'TASK_CONFIG_NOT_LOADED'
            });
        }

        const group = this.tasksConfig.groups[groupId];
        if (!group) {
            throw new ConfigurationError({
                name: 'TaskGroupNotFoundError',
                message: `Task group not found: ${groupId}`,
                code: 'TASK_GROUP_NOT_FOUND'
            });
        }

        return Object.values(group.tasks);
    }

    /** Get all task configurations */
    getAllTaskConfigs(): ReadonlyArray<z.infer<typeof TaskSchema>> {
        if (!this.tasksConfig) {
            throw new ConfigurationError({
                name: 'TaskConfigNotLoadedError',
                message: 'Task configurations not loaded',
                code: 'TASK_CONFIG_NOT_LOADED'
            });
        }

        return Object.values(this.tasksConfig.groups)
            .flatMap(group => Object.values(group.tasks));
    }

    /** Clear configuration cache */
    clearCache(): void {
        this.loader.clearCache();
        this.tasksConfig = undefined;
    }
}
