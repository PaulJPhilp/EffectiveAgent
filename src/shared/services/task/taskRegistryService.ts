import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { TaskModelMapping } from "../../schemas/taskConfig.js";
import { TaskModelMappingSchema } from "../../schemas/taskConfig.js";

interface TaskRegistryConfig {
    taskMappings: TaskModelMapping[];
}

interface TaskRegistryServiceOptions {
    tasksConfigPath?: string;
}

/**
 * Service for managing task registry and configurations
 */
export class TaskRegistryService {
    private static instance: TaskRegistryService;
    private config: TaskRegistryConfig;
    private tasksConfigPath: string;
    private isInitialized = false;

    private constructor(options: TaskRegistryServiceOptions = {}) {
        this.tasksConfigPath =
            options.tasksConfigPath ||
            path.join(process.cwd(), "src", "shared", "config", "tasks.json");
        this.config = {
            taskMappings: []
        };
    }

    /**
     * Get singleton instance of TaskRegistryService
     */
    public static async getInstance(): Promise<TaskRegistryService> {
        if (!TaskRegistryService.instance) {
            TaskRegistryService.instance = new TaskRegistryService();
            await TaskRegistryService.instance.initialize();
        }
        return TaskRegistryService.instance;
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
    public getTaskConfig(taskName: string): TaskModelMapping | undefined {
        this.ensureInitialized();
        return this.config.taskMappings.find(task => task.taskName === taskName);
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