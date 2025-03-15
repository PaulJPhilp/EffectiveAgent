import type { BaseModelProvider } from "../../interfaces/provider.js"
import type { ITaskRegistryService, ITaskService, TaskConfig, TaskExecutionResult } from "../../interfaces/task.js"
import { TaskRegistryService } from "../../services/task/taskRegistryService.js"
import { ModelService } from "../../services/model/modelService.js"

export class TaskService implements ITaskService {

    private taskRegistry: TaskRegistryService
    private modelService: ModelService

    constructor(
    ) { 
        this.taskRegistry = new TaskRegistryService();
        this.modelService = new ModelService()
    }

    public async executeTask(
        taskName: string,
        input: Record<string, unknown>
    ): Promise<TaskExecutionResult> {
        const taskConfig = this.taskRegistry.getTaskConfig(taskName)

        try {
            // Directly use the task's preferred model ID instead of using selectModel
            const preferredModelId = taskConfig?.primaryModelId
            if (!preferredModelId) {
                throw new Error(`No preferred model ID specified for task: ${taskName}`)
            }
            console.log(`[TaskService] Using preferred model directly: ${preferredModelId}`)
            
            // Get the model by ID
            const result = await this.modelService.completeWithModel(preferredModelId, {
                prompt: this.buildPrompt(taskConfig, input),
                temperature: taskConfig.temperature
            })

            return {
                taskName,
                result: result.text,
                modelId: preferredModelId,
                usage: result.usage
            }
        } catch (error) {
            console.error(`[TaskService] Error executing task ${taskName}:`, error)
            throw new Error(`Failed to execute task ${taskName}: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    public getAvailableTasks() { return this.taskRegistry.getAllTaskConfigs() }
    public getTaskConfig(taskName: string): TaskConfig { return this.taskRegistry.getTaskConfig(taskName) }

    private buildPrompt(taskConfig: TaskConfig, input: Record<string, unknown>): string {
        // In a real implementation, this would use a proper prompt template system
        // For now, we'll just do a simple string concatenation
        return `Task: ${taskConfig.description}\nInput: ${JSON.stringify(input)}`
    }
} 