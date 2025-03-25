import type { Task } from "./schemas/taskSchemas.js"

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
	loadTaskConfigurations(): void
	getTaskConfig(taskName: string): Task | undefined
	getAllTaskConfigs(): ReadonlyArray<Task>
	validateTaskConfig(config: Task): boolean
}

/**
 * Interface for task service
 */
export interface TaskService {
	executeTask(taskName: string, input: Record<string, unknown>): TaskExecutionResult
	getAvailableTasks(): ReadonlyArray<Task>
	getTaskByName(taskName: string): Task
} 