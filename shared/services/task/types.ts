import type { TaskDefinition } from "./schemas/taskConfig.js"

/**
 * Task configuration interface
 */
export interface Task extends TaskDefinition { }

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
	getAllTaskConfigs(): Task[]
	validateTaskConfig(config: Task): boolean
}

/**
 * Interface for task service
 */
export interface ITaskService {
	executeTask(taskName: string, input: Record<string, unknown>): TaskExecutionResult
	getAvailableTasks(): Task[]
	/**
	 * Get task by name
	 * @throws {Error} If task not found    
	 */
	getTaskByName(taskName: string): Task
} 