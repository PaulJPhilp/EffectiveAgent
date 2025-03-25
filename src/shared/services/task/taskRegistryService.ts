import type { AgentConfig } from "@agents/agent-service/types.ts";
import { TaskSchema, type Task } from "./schemas/taskSchemas.js";
import type { ITaskRegistryService } from "./types.js";

interface TaskRegistryConfig {
    tasks: Task[];
}

/**
 * Service for managing task registry and configurations
 */
export class TaskRegistryService implements ITaskRegistryService {
    private debug = false;
    private config: TaskRegistryConfig;

    constructor(config: AgentConfig) {
        if (this.debug) {
            console.log(`[TaskRegistryService] Initializing for agent: ${config.name}`);
        }

        // Transform and validate tasks from AgentConfig
        const validatedTasks = config.tasks?.map(task => ({
            taskName: task.name,
            description: task.description || "",
            primaryModelId: task.primaryModelId,
            fallbackModelIds: task.fallbackModelIds || [],
            requiredCapabilities: task.requiredCapabilities || [
                "text-generation",
                "function-calling"
            ],
            contextWindowSize: task.contextWindowSize || "8k",
            thinkingLevel: task.thinkingLevel || "basic",
            promptName: task.promptName || task.taskName,
            maxAttempts: task.maxAttempts || 3,
            timeout: task.timeout || 30000,
            temperature: task.temperature || 0.7,
            frequencyPenalty: task.frequencyPenalty || 0,
            presencePenalty: task.presencePenalty || 0,
            maxTokens: task.maxTokens || 4096,
            provider: task.provider,
            model: task.primaryModelId
        })) || [];

        // Validate tasks against schema
        this.config = {
            tasks: validatedTasks.map(task => TaskSchema.parse(task))
        };

        if (this.debug) {
            console.log(`[TaskRegistryService] Initialized with ${this.config.tasks.length} tasks`);
        }
    }

    /**
     * Load task configurations
     */
    public loadTaskConfigurations(): void {
        // Tasks are already loaded in constructor
        return;
    }

    /**
     * Get task configuration by name
     * @param taskName Name of the task to retrieve
     * @returns Task configuration or undefined if not found
     */
    public getTaskConfig(taskName: string): Task | undefined {
        return this.config.tasks.find(task => task.taskName === taskName);
    }

    /**
     * Get all available task configurations
     * @returns Array of task configurations
     */
    public getAllTaskConfigs(): Task[] {
        return this.config.tasks;
    }

    /**
     * Validate task configuration
     * @param config Task configuration to validate
     * @returns True if valid, false otherwise
     */
    public validateTaskConfig(config: Task): boolean {
        try {
            TaskSchema.parse(config);
            return true;
        } catch {
            return false;
        }
    }

} 