import type { AgentConfig } from "../../../agents/agent-service/types.js";
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


/**
 * Factory for selecting appropriate models based on requirements
 */
export class ModelSelectionFactory {
    readonly debug: boolean = false;
    private modelRegistry: ModelRegistryService;

    constructor(config: AgentConfig) {
        this.modelRegistry = new ModelRegistryService(config);
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
            console.log("[ModelSelectionFactory] Direct model selection");
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
            console.log("[ModelSelectionFactory] Selecting model with requirements:",
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
                requirements.capabilities?.every(cap =>
                    model.capabilities?.includes(cap) || false
                )
            );
        }

        // Filter by context window size if required
        if (requirements.contextWindowSize) {
            // Map context window size to numeric values

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
