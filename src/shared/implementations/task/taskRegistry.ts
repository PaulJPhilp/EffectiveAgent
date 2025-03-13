import type { ITaskRegistryService, TaskConfig } from "../../interfaces/task.js"
import type { ModelCapability } from "../../schemas/modelConfig.js"

export class TaskRegistryService implements ITaskRegistryService {
    private taskConfigs: Map<string, TaskConfig>

    constructor() {
        this.taskConfigs = new Map()
    }

    public async loadTaskConfigurations(): Promise<void> {
        // In a real implementation, this would load from a configuration file or database
        // For now, we'll initialize with some default tasks
        const defaultTasks: TaskConfig[] = [
            {
                name: "summarize",
                description: "Summarize a given text",
                requiredCapabilities: ["text-completion"],
                contextWindowSize: 4000,
                thinkingLevel: "basic",
                temperature: 0.3
            },
            {
                name: "analyze",
                description: "Perform detailed analysis of a given text",
                requiredCapabilities: ["text-completion"],
                contextWindowSize: 8000,
                thinkingLevel: "advanced",
                temperature: 0.7
            },
            {
                name: "generate-image",
                description: "Generate an image from a text description",
                requiredCapabilities: ["text-to-image"],
                thinkingLevel: "basic",
                temperature: 0.8
            }
        ]

        for (const task of defaultTasks) {
            this.taskConfigs.set(task.name, task)
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
        if (!config.name || !config.description || !config.requiredCapabilities) {
            return false
        }

        // Validate capabilities
        const validCapabilities: ModelCapability[] = [
            "text-completion",
            "text-to-image",
            "embeddings",
            "function-calling"
        ]
        if (!config.requiredCapabilities.every(cap => validCapabilities.includes(cap))) {
            return false
        }

        // Validate numeric fields
        if (config.contextWindowSize && config.contextWindowSize <= 0) {
            return false
        }
        if (config.temperature && (config.temperature < 0 || config.temperature > 1)) {
            return false
        }

        return true
    }
} 