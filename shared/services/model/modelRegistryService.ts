import fs from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { IModelSelectionService } from "./types.js";
import type { ModelCapability, ModelConfig } from "./schemas/modelConfig.js";
import { ModelConfigSchema } from "./schemas/modelConfig.js";

interface ModelRegistryConfig {
    models: ModelConfig[];
    defaultModelId: string;
    defaultTemperature: number;
}

interface ModelRegistryServiceOptions {
    modelsConfigPath: string;
}

/**
 * Service for managing model registry
 * Implements IModelSelectionService interface for direct model access
 */
export class ModelRegistryService implements IModelSelectionService {
    private debug: boolean = false;
    private config: ModelRegistryConfig;
    private modelsConfigPath: string;
    private isInitialized = false;

    constructor(options: ModelRegistryServiceOptions) {
        if (this.debug) {
            console.log(`[ModelRegistryService] Initializing with config path: ${options.modelsConfigPath}`);
        }
        this.modelsConfigPath = options.modelsConfigPath;
        if (!fs.opendirSync(this.modelsConfigPath)) {
            throw new Error(`Model registry config file not found: ${this.modelsConfigPath}`);
        }
        
        this.config = {
            models: [],
            defaultModelId: "",
            defaultTemperature: 0.2
        };
        this.initialize();
        const availableModels = this.config.models.map(model => model.id).join(', ');
        console.log(`[ModelRegistryService] Available models: |${availableModels}|`);
        if (availableModels.length === 0) {
            throw new Error("No models found in registry");
        }
    }

    /**
     * Initialize the model registry by loading configuration
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        if (this.debug) {
            console.log(`[ModelRegistryService] Initialize() with config path: ${this.modelsConfigPath}`);
        }
        try {
            const configFilename = join(this.modelsConfigPath, "models.json")
            const modelsData = fs.readFileSync(configFilename, "utf-8");
            const parsedModels = JSON.parse(modelsData);

            // Validate against schema
            const validatedConfig = z.object({
                models: z.array(ModelConfigSchema),
                defaultModelId: z.string(),
                defaultTemperature: z.number().min(0).max(1).default(0.2)
            }).parse(parsedModels);

            this.config = validatedConfig;
            this.isInitialized = true;

            if (this.debug) {
                console.log(
                    `Model registry initialized with ${this.config.models.length} models`
                );
            }
        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error("Invalid model registry configuration:", error.format());
                throw new Error("Failed to validate model registry configuration");
            }

            console.error("Failed to load model registry:", error);
            throw new Error("Failed to initialize model registry");
        }
    }

    /**
     * Get models with a specific capability ID
     */
    public getModelsWithCapabilityId(modelId: string): ModelConfig[] {
        return this.config.models.filter(model => model.id === modelId);
    }

    /**
     * Get model configuration by ID
     * @throws Error if model not found
     */
    public getModelById(modelId: string): ModelConfig {
        if (this.debug) {
            console.log(`[ModelRegistryService] Getting model by ID: |${modelId}|`);
            console.log(`[ModelRegistryService] Available models: |${this.config.models.map(model => model.id).join('|, |')}|`);
        }

        const model = this.config.models.find((model) => model.id.trim().toLowerCase() === modelId.trim().toLowerCase());
        if (!model) {
            throw new Error(`Model not found with ID: ${modelId}`);
        }
        return model;
    }

    /**
     * Get the default model
     * @throws Error if default model not found
     */
    public getDefaultModel(): ModelConfig {

        // getModelById will already throw if model not found
        return this.getModelById(this.config.defaultModelId);
    }

    /**
     * Get the default temperature
     */
    public getDefaultTemperature(): number {

        return this.config.defaultTemperature;
    }

    /**
     * Get all available models
     */
    public getAllModels(): ModelConfig[] {

        return [...this.config.models];
    }

    /**
     * Get all models with a specific capability
     */
    public getModelsWithCapability(capability: ModelCapability): ModelConfig[] {

        return this.config.models.filter(model =>
            model.capabilities?.includes(capability)
        );
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
