import { join } from 'node:path';
import type { AgentConfig } from "../../../agents/agent-service/types.js";
import { ModelConfigurationService } from './modelConfigurationService.js';
import type { ModelCapability, ModelConfig } from "./schemas/modelConfig.js";
import type { ModelSelectionService } from "./types.js";
/**
 * Service for managing model registry
 * Implements IModelSelectionService interface for direct model access
 */
export class ModelRegistryService implements ModelSelectionService {
    private debug = false;


    private configService: ModelConfigurationService;

    constructor(agentConfig: AgentConfig) {
        this.debug = agentConfig.debug || false;
        if (this.debug) {
            console.log('[ModelRegistryService] Initializing');
        }

        this.configService = new ModelConfigurationService({
            basePath: agentConfig.rootPath,
            configPath: join(agentConfig.rootPath, agentConfig.configFiles.models),
            environment: agentConfig.environment || 'development'
        });
    }

    /**
     * Get model configuration by ID
     * @throws Error if model not found
     */
    public getModelById(modelId: string): ModelConfig {
        if (this.debug) {
            console.log(`[ModelRegistryService] Getting model by ID: |${modelId}|`);
        }
        const model = this.configService.getModel(modelId);
        if (!model) {
            throw new Error(`Model not found with ID: ${modelId}`);
        }

        const provider = model.provider as "openai" | "anthropic" | "google" | "local" | "grok" | "deepseek";
        return {
            id: modelId,
            name: model.name,
            version: model.version,
            provider,
            modelName: model.modelName,
            contextWindowSize: model.contextWindowSize,
            capabilities: model.capabilities,
            maxTokens: model.maxTokens,
            metadata: {
                thinkingLevel: model.metadata?.thinkingLevel,
                description: `${model.metadata?.description}`,
                tags: [`provider:${provider}`]
            }
        };
    }

    /**
     * Get the default model
     * @throws Error if no text models are available
     */
    public getDefaultModel(): ModelConfig {
        const config = this.configService.getConfig();
        const defaultModelId = config.defaultModelId;
        if (!defaultModelId) {
            throw new Error("No default model configured");
        }
        return this.getModelById(defaultModelId);
    }

    /**
     * Get the default temperature
     */
    public getDefaultTemperature(): number {
        return 0.7; // Standard default temperature
    }

    /**
     * Get all models with a specific capability
     * @param capability The capability to filter models by
     * @returns Array of model configurations with the specified capability
     */
    public getModelsWithCapability(capability: ModelCapability): ModelConfig[] {
        const config = this.configService.getConfig();
        const models = config.models.filter(model => model.capabilities.includes(capability));

        return models;
    }

    /**
     * Get all available models
     */
    public getAllModels(): ModelConfig[] {
        const config = this.configService.getConfig();
        return config.models;
    }
}