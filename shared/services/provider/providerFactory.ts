import type { ModelConfig } from "../../schemas/modelConfig.js"
import type { TaskModelMapping } from "../../schemas/taskConfig.js"
import type { BaseModelProvider } from "../provider/modelProvider.js"
import { ModelRegistryService } from "../model/modelRegistryService.js"
import { TaskRegistryService } from "../task/taskRegistryService.js"
import { AnthropicProvider } from "./implementations/anthropicProvider.js"
import { GoogleProvider } from "./implementations/googleProvider.js"
import { OpenAIProvider } from "./implementations/openaiProvider.js"
import { ProviderRegistryService } from "./providerRegistry.js"

interface ProviderWithConfig {
    provider: BaseModelProvider
    temperature: number
    taskMapping?: TaskModelMapping
}

/**
 * Factory for creating model providers
 */
export class ProviderFactory {
    private modelRegistry: ModelRegistryService
    private taskRegistry: TaskRegistryService
    private providerRegistry: ProviderRegistryService

    constructor() {
        this.modelRegistry = new ModelRegistryService()
        this.taskRegistry = new TaskRegistryService()
        this.providerRegistry = new ProviderRegistryService()
    }

    /**
     * Create a provider for a specific task
     */
    public createProviderForTask(taskName: string): ProviderWithConfig {
        const taskConfig = this.taskRegistry.getTaskConfig(taskName)
        if (!taskConfig) {
            throw new Error(`No configuration found for task: ${taskName}`)
        }

        const modelConfig = this.modelRegistry.getModelById(taskConfig.primaryModelId)
        if (!modelConfig) {
            throw new Error(
                `Model not found for task ${taskName}: ${taskConfig.primaryModelId}`
            )
        }

        const providerConfig = this.providerRegistry.getProviderConfig(modelConfig.provider)
        if (!providerConfig) {
            throw new Error(`Provider not found for model ${modelConfig.id}: ${modelConfig.provider}`)
        }

        return {
            provider: this.createProvider(modelConfig, providerConfig.type),
            temperature: taskConfig.temperature ?? 0.2
        }
    }

    /**
     * Create a provider for a specific model ID
     */
    public createProviderForModelId(modelId: string): BaseModelProvider {
        const modelConfig = this.modelRegistry.getModelById(modelId)
        if (!modelConfig) {
            throw new Error(`Model not found: ${modelId}`)
        }

        const providerConfig = this.providerRegistry.getProviderConfig(modelConfig.provider)
        if (!providerConfig) {
            throw new Error(`Provider not found for model ${modelId}: ${modelConfig.provider}`)
        }

        return this.createProvider(modelConfig, providerConfig.type)
    }

    /**
     * Create a default provider
     */
    public createDefaultProvider(): ProviderWithConfig {
        const modelConfig = this.modelRegistry.getDefaultModel()
        if (!modelConfig) {
            throw new Error('Default model not found in model registry')
        }
        
        const providerConfig = this.providerRegistry.getProviderConfig(
            modelConfig.provider
        )
        if (!providerConfig) {
            throw new Error(
                `Provider not found for default model: ${modelConfig.provider}`
            )
        }

        return {
            provider: this.createProvider(modelConfig, providerConfig.type),
            temperature: this.modelRegistry.getDefaultTemperature()
        }
    }

    /**
     * Create a provider instance based on type
     */
    private createProvider(modelConfig: ModelConfig, providerType: string): BaseModelProvider {
        // For testing purposes, we'll use mock API keys
        // In a real implementation, these would come from environment variables
        const mockApiKey = "test-api-key-12345";
        
        switch (providerType) {
            case "openai":
                return new OpenAIProvider(modelConfig, mockApiKey)
            case "anthropic":
                return new AnthropicProvider(modelConfig, mockApiKey)
            case "google":
                return new GoogleProvider(modelConfig, mockApiKey)
            default:
                throw new Error(`Unsupported provider type: ${providerType}`)
        }
    }
} 