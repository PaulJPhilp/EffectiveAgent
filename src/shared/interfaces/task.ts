import type { ModelCapability, ThinkingLevel } from "../schemas/modelConfig.js"

/**
 * Task configuration interface
 */
export interface TaskConfig {
    name: string
    description: string
    requiredCapabilities: ModelCapability[]
    contextWindowSize?: number
    thinkingLevel?: ThinkingLevel
    temperature?: number
    preferredModelIds?: string[]
}

/**
 * Task execution result
 */
export interface TaskExecutionResult {
    taskName: string
    result: string
    modelId: string
    usage: {
        promptTokens: number
        completionTokens: number
        totalTokens: number
    }
}

/**
 * Interface for task registry service
 */
export interface ITaskRegistryService {
    loadTaskConfigurations(): Promise<void>
    getTaskConfig(taskName: string): TaskConfig
    getAllTaskConfigs(): TaskConfig[]
    validateTaskConfig(config: TaskConfig): boolean
}

/**
 * Interface for task service
 */
export interface ITaskService {
    executeTask(taskName: string, input: Record<string, unknown>): Promise<TaskExecutionResult>
    getAvailableTasks(): TaskConfig[]
    getTaskConfig(taskName: string): TaskConfig
} 