import type { ITaskRegistryService, TaskConfig } from "../../interfaces/task.js"
import type { ModelCapability } from "../../schemas/modelConfig.js"

export class TaskRegistryService implements ITaskRegistryService {
    private taskConfigs: Map<string, TaskConfig>

    constructor() {
        this.taskConfigs = new Map()
        this.loadTaskConfigurations()
    }

    public async loadTaskConfigurations(): Promise<void> {
        // In a real implementation, this would load from a configuration file or database
        // For now, we'll initialize with some default tasks
        const defaultTasks: TaskConfig[] = [
            {
                taskName: "summarize",
                description: "Summarize a given text",
                requiredCapabilities: ["text-generation"],
                contextWindowSize: "large-context-window",
                thinkingLevel: "low",
                temperature: 0.3,
                primaryModelId: "openai/gpt-4o",
                fallbackModelIds: ["openai/gpt-4o-mini"]
            },
            {
                taskName: "analyze",
                description: "Perform detailed analysis of a given text",
                requiredCapabilities: ["text-generation"],
                contextWindowSize: "large-context-window",
                thinkingLevel: "high",
                temperature: 0.7,
                primaryModelId: "openai/gpt-4o",
                fallbackModelIds: ["openai/gpt-4o-mini"]
            },
            {
                taskName: "generate-image",
                description: "Generate an image from a text description",
                requiredCapabilities: ["text-to-image"],
                thinkingLevel: "low",
                temperature: 0.8,
                primaryModelId: "gpt-4o",
                fallbackModelIds: ["gpt-4o-mini"]
            }
        ]

        for (const task of defaultTasks) {
            this.taskConfigs.set(task.taskName, task)
        }
    }

    public getTaskConfig(taskName: string): TaskConfig {
        const config = this.taskConfigs.get(taskName)
        if (!config) {
            throw new Error(`Task configuration not found for task: ${taskName}`)
        }
        return config
    }

    public getAllTaskConfigs(): TaskConfig[] {
        return Array.from(this.taskConfigs.values())
    }

    public validateTaskConfig(config: TaskConfig): boolean {
        // Validate required fields
        if (!config.taskName || !config.description || !config.requiredCapabilities) {
            return false
        }

        // Validate capabilities
        const validCapabilities: ModelCapability[] = [
            "text-generation",
            "text-to-image",
            "embeddings",
            "function-calling"
        ]
        if (!config.requiredCapabilities.every(cap => validCapabilities.includes(cap))) {
            return false
        }

        // Validate context window size
        if (config.contextWindowSize === undefined) {
            return false
        }

        // Validate numeric fields
        if (config.temperature && (config.temperature < 0 || config.temperature > 1)) {
            return false
        }

        return true
    }
} 