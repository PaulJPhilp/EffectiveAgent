import fs from "node:fs";
import path, { join } from "node:path";
import { z } from "zod";
import type { ITaskRegistryService, Task } from "./types.js";
import type { TaskDefinition } from "./schemas/taskConfig.js";
import { TaskDefinitionSchema } from "./schemas/taskConfig.js";

interface TaskRegistryConfig {
    tasks: TaskDefinition[];
}

interface TaskRegistryServiceOptions {
    tasksConfigPath: string;
}

/**
 * Service for managing task registry and configurations
 */
export class TaskRegistryService implements ITaskRegistryService {
    private debug = false;
    private config: TaskRegistryConfig;
    private tasksConfigPath: string;
    private isInitialized = false;
    private path: string = path.join(process.cwd(), "shared", "config", "tasks.json");

    constructor(options: TaskRegistryServiceOptions) {
        if (this.debug) console.log(`[TaskRegistryService] Initializing with config path: ${options.tasksConfigPath}`);
        this.tasksConfigPath = join(options.tasksConfigPath, "tasks.json");
        this.config = { tasks: [] };
        this.initialize();
        if (this.debug) console.log(`[TaskRegistryService] Task service initialized`);
    }

    /**
     * Initialize the task registry by loading configuration
     */
    private async initialize(): Promise<void> {
        if (this.debug) console.log(`[TaskRegistryService] Initializing with config path: ${this.tasksConfigPath}`);
        if (this.isInitialized) {
            return;
        }

        try {
            if (!fs.existsSync(this.tasksConfigPath)) {
                throw new Error(`Tasks configuration file not found: ${this.tasksConfigPath}`);
            }
            const tasksData = fs.readFileSync(this.tasksConfigPath, "utf-8");
            const parsedTasks = JSON.parse(tasksData);

            // Validate against schema
            const validatedConfig = z.object({
                tasks: z.array(TaskDefinitionSchema)
            }).parse(parsedTasks);

            this.config = validatedConfig;
            this.isInitialized = true;
            if (this.debug) console.log(
                `Task registry initialized with ${this.config.tasks.length} tasks`
            );
        } catch (error) {
            if (this.debug) console.error("Failed to load task registry:", error);
            throw new Error("Failed to initialize task registry");
        }
    }

    public async loadTaskConfigurations(): Promise<void> {
        await this.initialize();
    }

    /**
     * Get all available task configurations
     */
    public getAllTaskConfigs() {
        return this.config.tasks;
    }

    /**
     * Get task configuration by name
     */
    public getTaskConfig(taskName: string): Task | undefined {
        return this.config.tasks.find(task => task.taskName === taskName);
    }

    /**
     * Validate task configuration
     */
    public validateTaskConfig(config: Task): boolean {
        return TaskDefinitionSchema.safeParse(config).success;
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