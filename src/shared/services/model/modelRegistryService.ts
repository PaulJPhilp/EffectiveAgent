import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { ModelConfig } from "../../schemas/modelConfig.js";
import { ModelConfigSchema } from "../../schemas/modelConfig.js";

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
 */
export class ModelRegistryService {
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

    /**
     * Get model configuration by ID
     */
    public getModelById(modelId: string): ModelConfig | undefined {
        this.ensureInitialized();
        return this.config.models.find((model) => model.id === modelId);
    }

    /**
     * Get the default model
     */
    public getDefaultModel(): ModelConfig | undefined {
        this.ensureInitialized();
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
     * Ensure the service is initialized
     * @private
     */
    private ensureInitialized(): void {
        if (!this.isInitialized) {
            throw new Error("Model registry service is not initialized");
        }
    }
}
