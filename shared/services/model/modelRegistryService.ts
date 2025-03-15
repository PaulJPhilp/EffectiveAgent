import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { ModelConfig, ModelCapability } from "../../schemas/modelConfig.js";
import { ModelConfigSchema } from "../../schemas/modelConfig.js";
import type { IModelSelectionService } from "../../interfaces/model.js";
import type { BaseModelProvider } from "../../interfaces/provider.js";
import type { ModelSelectionResult } from "./modelSelectionFactory.js";

interface ModelRegistryConfig {
    models: ModelConfig[];
    defaultModelId: string;
    defaultTemperature: number;
}

interface ModelRegistryServiceOptions {
    modelsConfigPath?: string;
}

/**
 * Service for managing model registry
 * Implements IModelSelectionService interface for direct model access
 */
export class ModelRegistryService implements IModelSelectionService {
    private config: ModelRegistryConfig;
    private modelsConfigPath: string;
    private isInitialized = false;

    constructor(options: ModelRegistryServiceOptions = {}) {
        this.modelsConfigPath =
            options.modelsConfigPath ||
            path.join(process.cwd(), "src", "shared", "config", "models.json");
        this.config = {
            models: [],
            defaultModelId: "",
            defaultTemperature: 0.2
        };
    }

    /**
     * Initialize the model registry by loading configuration
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            // Load and parse models config
            const modelsData = await fs.promises.readFile(this.modelsConfigPath, "utf-8");
            const parsedModels = JSON.parse(modelsData);

            // Validate against schema
            const validatedConfig = z.object({
                models: z.array(ModelConfigSchema),
                defaultModelId: z.string(),
                defaultTemperature: z.number().min(0).max(1).default(0.2)
            }).parse(parsedModels);

            this.config = validatedConfig;
            this.isInitialized = true;

            console.log(
                `Model registry initialized with ${this.config.models.length} models`
            );
        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error("Invalid model registry configuration:", error.format());
                throw new Error("Failed to validate model registry configuration");
            }

            console.error("Failed to load model registry:", error);
            throw new Error("Failed to initialize model registry");
        }
    }


    public getModelsWithCapabilityId(modelId: string): ModelConfig[] {
        this.ensureInitialized();
        return this.config.models.filter(model => model.id === modelId);
    }

    /**
     * Get model configuration by ID
     * @throws Error if model not found
     */
    public getModelById(modelId: string): ModelConfig {
        this.ensureInitialized();
        const model = this.config.models.find((model) => model.id === modelId);
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
        this.ensureInitialized();
        // getModelById will already throw if model not found
        return this.getModelById(this.config.defaultModelId);
    }

    /**
     * Get the default temperature
     */
    public getDefaultTemperature(): number {
        this.ensureInitialized();
        return this.config.defaultTemperature;
    }

    /**
     * Get all available models
     */
    public getAllModels(): ModelConfig[] {
        this.ensureInitialized();
        return [...this.config.models];
    }
    
    /**
     * Get all models with a specific capability
     */
    public getModelsWithCapability(capability: ModelCapability): ModelConfig[] {
        this.ensureInitialized();
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
