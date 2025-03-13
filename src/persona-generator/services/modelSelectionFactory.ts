import type { ModelConfig } from "../schemas/modelRegistry";
import { ModelRegistryService } from "./modelRegistryService";

/**
 * Factory for selecting appropriate models based on task requirements
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
     * Select a model for a specific task
     * @param taskName The name of the task
     * @returns Model configuration for the task
     * @throws Error if no suitable model is found
     */
    public selectModelForTask(taskName: string): ModelConfig {
        const model = this.modelRegistry.getModelForTask(taskName);

        if (!model) {
            throw new Error(`No suitable model found for task: ${taskName}`);
        }

        return model;
    }

    /**
     * Get model by ID
     * @param modelId The model ID
     * @returns Model configuration
     * @throws Error if model is not found
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
     * @returns Default model configuration
     * @throws Error if default model is not found
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
}
