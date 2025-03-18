import { ModelRegistryService } from "./modelRegistryService.js";
import type {
    ContextWindowSize,
    ModelCapability,
    ModelConfig,
    ThinkingLevel
    } from "./schemas/modelConfig.js";

/**
 * Result of model selection including model config and settings
 */
export interface ModelSelectionResult {
    model: ModelConfig;
    temperature: number;
}

interface ModelSelectionFactoryOptions {
    modelsConfigPath: string;
}

/**
 * Factory for selecting appropriate models based on requirements
 */
export class ModelSelectionFactory {
    readonly debug: boolean = false;
    private modelRegistry: ModelRegistryService;
    constructor(options: ModelSelectionFactoryOptions) {
        this.modelRegistry = new ModelRegistryService({ modelsConfigPath: options.modelsConfigPath });
    }

    /**
     * Check if a model meets the context window size requirement
     * @private
     */
    private meetsContextWindowRequirement(model: ModelConfig, requiredSize?: ContextWindowSize): boolean {
        // If no requirement is specified, any model meets the requirement
        if (!requiredSize) {
            if (this.debug) {
                console.log(`No context window size requirement for ${model.id}`);
            }
            return true;
        }

        if (this.debug) {
            console.log(`Context window check for ${model.id}:`);
            console.log(`- Required size: "${requiredSize}" (type: ${typeof requiredSize})`);
            console.log(`- Model size: "${model.contextWindowSize}" (type: ${typeof model.contextWindowSize})`);
        }

        // If model has contextWindowSize, use direct comparison
        if (model.contextWindowSize) {
            // Log the exact values for equality check
            console.log(`- Exact values: '${model.contextWindowSize}' vs '${requiredSize}'`);

            // Try both strict and loose equality
            const strictEqual = model.contextWindowSize === requiredSize;
            const looseEqual = model.contextWindowSize == requiredSize;

            console.log(`- Strict equality (===): ${strictEqual}`);
            console.log(`- Loose equality (==): ${looseEqual}`);

            // Return strict equality result
            return strictEqual;
        }

        // Legacy fallback using token count
        if (!model.contextWindowSize) {
            if (this.debug) {
                console.log(`Legacy check for ${model.id} with context window ${model.contextWindowSize} meets requirement ${requiredSize}`);
            }
            return false;
        }

        if (this.debug) {
            console.log(`Legacy check for ${model.id} with context window ${model.contextWindowSize} meets requirement ${requiredSize}`);
        }

        switch (requiredSize) {
            case "small-context-window":
                return model.contextWindowSize >= 4096; // Minimum 4K tokens
            case "medium-context-window":
                return model.contextWindowSize >= 32000; // Minimum 32K tokens
            case "large-context-window":
                return model.contextWindowSize >= 100000; // Minimum 100K tokens
            default:
                return false;
        }
    }

    /**
     * Get a model by ID or return the default model
     * 
     * @param modelId - Optional model ID to retrieve
     * @param temperature - Optional temperature setting
     * @returns Model selection result with model config and settings
     * @throws Error if no models are available
     */
    public getModel(modelId?: string, temperature?: number): ModelSelectionResult {
        if (this.debug) {
            console.log(`[ModelSelectionFactory] Direct model selection`);
        }

        // If model ID is specified, use it directly
        if (modelId) {
            const model = this.modelRegistry.getModelById(modelId);
            if (this.debug) {
                console.log(`[ModelSelectionFactory] Checking for model: ${modelId}`);
            }

            if (model) {
                if (this.debug) {
                    console.log(`[ModelSelectionFactory] Using model: ${model.id}`);
                }
                return {
                    model,
                    temperature: temperature ??
                        this.modelRegistry.getDefaultTemperature()
                };
            }
        }

        // If no model ID or not found, use the first available model
        const allModels = this.getAllModels();
        if (this.debug) {
            console.log('[ModelSelectionFactory] Available models:',
                JSON.stringify(allModels.map(m => m.id), null, 2));
        }

        if (allModels.length === 0) {
            console.error('[ModelSelectionFactory] No models available');
            throw new Error("No models available for selection");
        }

        // Simply use the first available model
        if (this.debug) {
            console.log(`[ModelSelectionFactory] Using first available model: ${allModels[0].id}`);
        }
        return {
            model: allModels[0],
            temperature: temperature ?? this.modelRegistry.getDefaultTemperature()
        };
    }

    /**
     * Select a model based on provided requirements
     */
    public selectModel(requirements: {
        capabilities?: ModelCapability[];
        contextWindowSize?: ContextWindowSize;
        thinkingLevel?: ThinkingLevel;
        temperature?: number;
        preferredModelId?: string;
    }): ModelSelectionResult {
        if (this.debug) {
            console.log(`[ModelSelectionFactory] Selecting model with requirements:`,
                JSON.stringify(requirements, null, 2));
        }

        // If preferred model ID is provided and exists, use it directly
        if (requirements.preferredModelId) {
            try {
                const model = this.modelRegistry.getModelById(
                    requirements.preferredModelId
                );
                if (this.debug) {
                    console.log(`[ModelSelectionFactory] Using preferred model: ${model.id}`);
                }

                return {
                    model,
                    temperature: requirements.temperature ??
                        this.modelRegistry.getDefaultTemperature()
                };
            } catch (error) {
                console.warn(`[ModelSelectionFactory] Preferred model ${requirements.preferredModelId} not found, continuing selection`);
                // Continue with regular model selection if preferred model is not found
            }
        }

        // Filter models based on capabilities
        let candidateModels = this.getAllModels();

        if (requirements.capabilities && requirements.capabilities.length > 0) {
            candidateModels = candidateModels.filter(model =>
                requirements.capabilities!.every(cap =>
                    model.capabilities?.includes(cap) || false
                )
            );
        }

        // Filter by context window size if required
        if (requirements.contextWindowSize) {
            // Map context window size to numeric values
            const sizeMap = {
                'small-context-window': 4000,
                'medium-context-window': 8000,
                'large-context-window': 16000,
                'extra-large-context-window': 128000
            }

            candidateModels = candidateModels.filter(model =>
                model.contextWindowSize === requirements.contextWindowSize
               );
        }

        console.log(`[ModelSelectionFactory] Found ${candidateModels.length} candidate models`);

        if (candidateModels.length === 0) {
            console.error('[ModelSelectionFactory] No models match the requirements');
            throw new Error(`No models found matching requirements: ${JSON.stringify(requirements)}`);
        }

        // Sort models by preference (currently just using the first matching model)
        const selectedModel = candidateModels[0];
        console.log(`[ModelSelectionFactory] Selected model: ${selectedModel.id}`);

        return {
            model: selectedModel,
            temperature: requirements.temperature ??
                this.modelRegistry.getDefaultTemperature()
        };
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
