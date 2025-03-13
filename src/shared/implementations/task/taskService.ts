import type { IModelSelectionService } from "../../interfaces/model.js"
import type { BaseModelProvider } from "../../interfaces/provider.js"
import type { ITaskRegistryService, ITaskService, TaskConfig, TaskExecutionResult } from "../../interfaces/task.js"

export class TaskService implements ITaskService {
    constructor(
        private taskRegistry: ITaskRegistryService,
        private modelSelection: IModelSelectionService,
        private modelProvider: BaseModelProvider
    ) { }

    public async executeTask(
        taskName: string,
        input: Record<string, unknown>
    ): Promise<TaskExecutionResult> {
        const taskConfig = this.taskRegistry.getTaskConfig(taskName)

        // Select model based on task requirements
        const modelResult = this.modelSelection.selectModel({
            capabilities: taskConfig.requiredCapabilities,
            thinkingLevel: taskConfig.thinkingLevel,
            contextWindowSize: taskConfig.contextWindowSize,
            preferredModelId: taskConfig.preferredModelIds?.[0]
        })

        // Execute the task using the selected model
        const result = await this.modelProvider.complete({
            prompt: this.buildPrompt(taskConfig, input),
            temperature: taskConfig.temperature,
            maxTokens: taskConfig.contextWindowSize
        })

        return {
            taskName,
            result: result.text,
            modelId: modelResult.model.id,
            usage: result.usage
        }
    }

    public getAvailableTasks(): TaskConfig[] {
        return this.taskRegistry.getAllTaskConfigs()
    }

    public getTaskConfig(taskName: string): TaskConfig {
        return this.taskRegistry.getTaskConfig(taskName)
    }

    private buildPrompt(taskConfig: TaskConfig, input: Record<string, unknown>): string {
        // In a real implementation, this would use a proper prompt template system
        // For now, we'll just do a simple string concatenation
        return `Task: ${taskConfig.description}\nInput: ${JSON.stringify(input)}`
    }
} 