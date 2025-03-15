import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { TaskModelMapping } from "../../schemas/taskConfig.js";
import { TaskModelMappingSchema } from "../../schemas/taskConfig.js";
import type { ITaskRegistryService, TaskConfig } from "../../interfaces/task.js";

interface TaskRegistryConfig {
    taskMappings: TaskModelMapping[];
}

interface TaskRegistryServiceOptions {
    tasksConfigPath?: string;
}

/**
 * Service for managing task registry and configurations
 */
export class TaskRegistryService implements ITaskRegistryService {
    private config: TaskRegistryConfig;
    private tasksConfigPath: string;
    private isInitialized = false;

    constructor(options: TaskRegistryServiceOptions = {}) {
        this.tasksConfigPath =
            options.tasksConfigPath ||
            path.join(process.cwd(), "src", "shared", "config", "tasks.json");
        this.config = {
            taskMappings: []
        };
    }

    /**
     * Initialize the task registry by loading configuration
     */
    private async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            const tasksData = await fs.promises.readFile(this.tasksConfigPath, "utf-8");
            const parsedTasks = JSON.parse(tasksData);

            // Validate against schema
            const validatedConfig = z.object({
                taskMappings: z.array(TaskModelMappingSchema)
            }).parse(parsedTasks);

            this.config = validatedConfig;
            this.isInitialized = true;

            console.log(
                `Task registry initialized with ${this.config.taskMappings.length} task mappings`
            );
        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error("Invalid task registry configuration:", error.format());
                throw new Error("Failed to validate task registry configuration");
            }

            console.error("Failed to load task registry:", error);
            throw new Error("Failed to initialize task registry");
        }
    }

    public async loadTaskConfigurations(): Promise<void> {
        await this.initialize();
    }

    /**
     * Get all available task mappings
     */
    public getAllTaskMappings(): TaskModelMapping[] {
        this.ensureInitialized();
        return [...this.config.taskMappings];
    }

    /**
     * Get task configuration by name
     */
    public getTaskConfig(taskName: string): TaskConfig {
        const taskConfig = this.config.taskMappings.find(task => task.taskName === taskName)
        if (!taskConfig) {
            throw new Error(`Task configuration not found for task: ${taskName}`)
        }
        return taskConfig
    }

    /**
     * Get all available task configurations
     */
    public getAllTaskConfigs(): TaskConfig[] {
        this.ensureInitialized();
        return [...this.config.taskMappings];
    }

    /**
     * Validate task configuration
     */
    public validateTaskConfig(config: TaskConfig): boolean {
        return TaskModelMappingSchema.safeParse(config).success;
    }

    /**
     * Ensure the service is initialized
     * @private
     */
    private ensureInitialized(): void {
        if (!this.isInitialized) {
            throw new Error("Task registry service is not initialized");
        }
    }
} 