import type { ModelSelectionService } from "./types.js";
import type { ModelCapability, ModelConfig } from "./schemas/modelConfig.js";
import type { AgentConfig } from "../../../agents/config/config-types.js";

/**
 * Service for managing model registry
 * Implements IModelSelectionService interface for direct model access
 */
export class ModelRegistryService implements ModelSelectionService {
    private debug = false;
    private config: AgentConfig;
    private isInitialized = false;

    constructor(config: AgentConfig) {
        if (this.debug) {
            console.log('[ModelRegistryService] Initializing');
        }
        this.config = config;
        const textModels = Object.keys(config.models.text);
        const embeddingModels = Object.keys(config.models.embedding);
        if (this.debug) {
            console.log(`[ModelRegistryService] Available text models: |${textModels.join(', ')}|`);
            console.log(`[ModelRegistryService] Available embedding models: |${embeddingModels.join(', ')}|`);
        }
        if (textModels.length === 0 && embeddingModels.length === 0) {
            throw new Error("No models found in registry");
        }
    }

    /**
     * Get model configuration by ID
     * @throws Error if model not found
     */
    public getModelById(modelId: string): ModelConfig {
        if (this.debug) {
            console.log(`[ModelRegistryService] Getting model by ID: |${modelId}|`);
        }
        const model = this.config.models.text[modelId] || this.config.models.embedding[modelId];
        if (!model) {
            throw new Error(`Model not found with ID: ${modelId}`);
        }
        const isEmbedding = modelId in this.config.models.embedding;
        const provider = model.provider as "openai" | "anthropic" | "google" | "local" | "grok" | "deepseek";
        return {
            id: modelId,
            provider,
            modelName: model.model,
            contextWindowSize: isEmbedding ? "small-context-window" : "large-context-window",
            capabilities: isEmbedding ? ["embeddings"] : ["text-generation", "function-calling", "chat"],
            maxTokens: model.maxTokens,
            metadata: {
                thinkingLevel: isEmbedding ? "none" : "high",
                description: `${isEmbedding ? 'Embedding model' : 'Model'} ${model.model} from ${provider}`,
                tags: [`provider:${provider}`, `type:${isEmbedding ? 'embedding' : 'text'}`]
            }
        };
    }

    /**
     * Get the default model
     * @throws Error if no text models are available
     */
    public getDefaultModel(): ModelConfig {
        const textModels = Object.keys(this.config.models.text);
        if (textModels.length === 0) {
            throw new Error("No text models available in registry");
        }
        return this.getModelById(textModels[0]);
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
        const models: ModelConfig[] = [];
        
        // For text models
        if (capability === "text-generation" || 
            capability === "function-calling" || 
            capability === "chat") {
            for (const modelId of Object.keys(this.config.models.text)) {
                models.push(this.getModelById(modelId));
            }
        }

        // For embedding models
        if (capability === "embeddings") {
            for (const modelId of Object.keys(this.config.models.embedding)) {
                models.push(this.getModelById(modelId));
            }
        }

        return models;
    }

    /**
     * Get all available models
     */
    public getAllModels(): ModelConfig[] {
        const models: ModelConfig[] = [];
        
        // Add text models
        for (const modelId of Object.keys(this.config.models.text)) {
            models.push(this.getModelById(modelId));
        }
        
        // Add embedding models
        for (const modelId of Object.keys(this.config.models.embedding)) {
            models.push(this.getModelById(modelId));
        }
        
        return models;
    }

    /**
     * Ensure the service is initialized
     * @private
     */
    private ensureInitialized(): void {
        if (!this.isInitialized) {
            throw new Error("Model registry service is not initialized");
        }
    }
}
