import type { ModelCapability, ModelConfig, ThinkingLevel } from "../../schemas/modelConfig.js";
import type { ContextWindowSize } from "../../schemas/taskConfig.js";
import { ModelRegistryService } from "./modelRegistryService.js";

/**
 * Result of model selection including model config and settings
 */
export interface ModelSelectionResult {
    model: ModelConfig;
    temperature: number;
}

/**
 * Factory for selecting appropriate models based on requirements
 */
export class ModelSelectionFactory {
    private modelRegistry: ModelRegistryService;
    private static instance: ModelSelectionFactory;

    private constructor(modelRegistry: ModelRegistryService) {
        this.modelRegistry = modelRegistry;
    }

    /**
     * Get singleton instance of ModelSelectionFactory
     */
    public static async getInstance(): Promise<ModelSelectionFactory> {
        if (!ModelSelectionFactory.instance) {
            const registry = new ModelRegistryService();
            await registry.initialize();
            ModelSelectionFactory.instance = new ModelSelectionFactory(registry);
        }
        return ModelSelectionFactory.instance;
    }

    /**
     * Check if a model meets the context window size requirement
     * @private
     */
    private meetsContextWindowRequirement(model: ModelConfig, requiredSize: ContextWindowSize): boolean {
        if (!model.contextWindow) return false;

        switch (requiredSize) {
            case "small-context-window":
                return model.contextWindow >= 4096; // Minimum 4K tokens
            case "medium-context-window":
                return model.contextWindow >= 32768; // Minimum 32K tokens
            case "large-context-window":
                return model.contextWindow >= 100000; // Minimum 100K tokens
            default:
                return false;
        }
    }

    /**
     * Select a model based on requirements
     * @param requirements Model selection requirements
     * @returns Model selection result with model config and settings
     * @throws Error if no suitable model is found
     */
    public selectModel(requirements: {
        capabilities?: ModelCapability[];
        contextWindowSize?: ContextWindowSize;
        thinkingLevel?: ThinkingLevel;
        temperature?: number;
        preferredModelId?: string;
    }): ModelSelectionResult {
        const {
            capabilities = [],
            contextWindowSize = "small-context-window",
            thinkingLevel,
            temperature,
            preferredModelId
        } = requirements;

        // Try preferred model first if specified
        if (preferredModelId) {
            const model = this.modelRegistry.getModelById(preferredModelId);
            if (model &&
                this.meetsContextWindowRequirement(model, contextWindowSize) &&
                (!capabilities.length || capabilities.every(cap => model.capabilities.includes(cap))) &&
                (!thinkingLevel || (model.thinkingLevel && this.meetsThinkingLevelRequirement(model.thinkingLevel, thinkingLevel)))
            ) {
                return {
                    model,
                    temperature: temperature ?? this.modelRegistry.getDefaultTemperature()
                };
            }
        }

        // Filter models by requirements
        let suitableModels = this.getAllModels().filter(model =>
            this.meetsContextWindowRequirement(model, contextWindowSize) &&
            (!capabilities.length || capabilities.every(cap => model.capabilities.includes(cap)))
        );

        // Filter by thinking level if required
        if (thinkingLevel) {
            suitableModels = suitableModels.filter(model =>
                model.thinkingLevel &&
                this.meetsThinkingLevelRequirement(model.thinkingLevel, thinkingLevel)
            );
        }

        if (suitableModels.length === 0) {
            throw new Error("No model found meeting the specified requirements");
        }

        // Sort by cost (lowest first)
        suitableModels.sort((a, b) => (a.costPer1kTokens || 0) - (b.costPer1kTokens || 0));

        return {
            model: suitableModels[0],
            temperature: temperature ?? this.modelRegistry.getDefaultTemperature()
        };
    }

    /**
     * Check if a model's thinking level meets the minimum requirement
     * @private
     */
    private meetsThinkingLevelRequirement(modelLevel: ThinkingLevel, requiredLevel: ThinkingLevel): boolean {
        const levels = { "low": 1, "medium": 2, "high": 3 };
        return levels[modelLevel] >= levels[requiredLevel];
    }

    /**
     * Get model by ID
     */
    public getModelById(modelId: string): ModelConfig {
        const model = this.modelRegistry.getModelById(modelId);
        if (!model) {
            throw new Error(`Model not found with ID: ${modelId}`);
        }
        return model;
    }

    /**
     * Get the default model
     */
    public getDefaultModel(): ModelConfig {
        const model = this.modelRegistry.getDefaultModel();
        if (!model) {
            throw new Error("Default model not found");
        }
        return model;
    }

    /**
     * Get all available models
     */
    public getAllModels(): ModelConfig[] {
        return this.modelRegistry.getAllModels();
    }

    /**
     * Get all models that have a specific capability
     */
    public getModelsWithCapability(capability: ModelCapability): ModelConfig[] {
        return this.getAllModels().filter(model =>
            model.capabilities?.includes(capability)
        );
    }
}
