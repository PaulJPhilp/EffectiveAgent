import { ConfigurationLoader } from '../configuration/configurationLoader.js';
import { ConfigurationError } from '../configuration/types.js';
import { type Task, type Tasks } from './schemas/taskSchemas.js';

/** Task configuration options */
interface TaskConfigurationOptions {
    readonly configPath: string;
    readonly environment?: string;
}

/** Task configuration service */
export class TaskConfigurationService {
    private readonly loader: ConfigurationLoader;
     tasks?: Tasks

    constructor(options: TaskConfigurationOptions) {
        this.loader = new ConfigurationLoader({
            basePath: options.configPath,
            environment: options.environment,
            validateSchema: true
        });
        this.loadTasks()
    }

    /** Load task configurations */
    loadTasks(): void {
        this.tasks = this.loader.loadConfig("tasks.json")

    }

    /** Get task configuration by ID */
    getTask(taskId: string): Task {
        if (!this.tasks) {
            throw new ConfigurationError({
                name: 'TaskConfigNotLoadedError',
                message: 'Task configurations not loaded',
                code: 'TASK_CONFIG_NOT_LOADED'
            });
        }

        throw new ConfigurationError({
            name: 'TaskNotFoundError',
            message: `Task not found: ${taskId}`,
            code: 'TASK_NOT_FOUND'
        });
    }


    /** Get all task configurations */
    getAllTaskConfigs(): ReadonlyArray<Task> {
        if (!this.tasks) {
            throw new ConfigurationError({
                name: 'TaskConfigNotLoadedError',
                message: 'Task configurations not loaded',
                code: 'TASK_CONFIG_NOT_LOADED'
            });
        }

        return this.tasks.tasks
    }

    /** Clear configuration cache */
    clearCache(): void {
        this.loader.clearCache();
        this.tasks = undefined;
    }
}
