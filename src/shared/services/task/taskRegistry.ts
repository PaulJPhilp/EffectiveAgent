import type { ITaskRegistryService } from "./types.js"
import type { Task } from './schemas/taskSchemas.ts'
import type { ModelCapability } from "../model/schemas/modelConfig.js"

export class TaskRegistryService implements ITaskRegistryService {
    private taskConfigs: Map<string, Task> = new Map()

    constructor() {
        console.log("Initializing TaskRegistryService...")
        this.loadTaskConfigurations()
    }

    public async loadTaskConfigurations(): Promise<void> {
        console.log("Loading task configurations...")
        const defaultTasks: Task[] = []
        this.taskConfigs = new Map(defaultTasks.map(task => [task.taskName, task]))
    }

    public getTaskConfig(taskName: string): Task | undefined {
        const config = this.taskConfigs.get(taskName)
        if (!config) {
            throw new Error(`Task configuration not found for task: ${taskName}`)
        }
        return config
    }

    public getAllTaskConfigs(): Task[] {
        return Array.from(this.taskConfigs.values())
    }

    public validateTaskConfig(config: Task): boolean {
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