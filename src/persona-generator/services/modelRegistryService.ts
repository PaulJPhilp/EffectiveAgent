import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
    ModelRegistryConfigSchema,
    type ModelConfig,
    type ModelRegistryConfig,
    type TaskModelMapping,
} from "../schemas/modelRegistry";

interface ModelRegistryServiceOptions {
    configPath?: string;
}

/**
 * Service for managing model registry and task-to-model mappings
 */
export class ModelRegistryService {
    private config: ModelRegistryConfig;
    private configPath: string;
    private isInitialized = false;

    constructor(options: ModelRegistryServiceOptions = {}) {
        this.configPath =
            options.configPath ||
            path.join(__dirname, "../config/modelRegistry.json");
        this.config = {
            models: [],
            taskMappings: [],
            defaultModelId: "",
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
            const configData = await fs.promises.readFile(this.configPath, "utf-8");
            const parsedConfig = JSON.parse(configData);

            // Validate against schema
            const validatedConfig = ModelRegistryConfigSchema.parse(parsedConfig);
            this.config = validatedConfig;
            this.isInitialized = true;

            console.log(
                `Model registry initialized with ${this.config.models.length} models and ${this.config.taskMappings.length} task mappings`,
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
     * Get the default model configuration
     */
    public getDefaultModel(): ModelConfig | undefined {
        this.ensureInitialized();
        return this.getModelById(this.config.defaultModelId);
    }

    /**
     * Get model configuration for a specific task
     * @param taskName The name of the task
     * @param useFallback Whether to return a fallback model if primary is not available
     */
    public getModelForTask(
        taskName: string,
        useFallback = true,
    ): ModelConfig | undefined {
        this.ensureInitialized();

        const taskMapping = this.config.taskMappings.find(
            (mapping) => mapping.taskName === taskName,
        );
        if (!taskMapping) {
            console.warn(
                `No task mapping found for task: ${taskName}, using default model`,
            );
            return this.getDefaultModel();
        }

        // Try to get primary model
        const primaryModel = this.getModelById(taskMapping.primaryModelId);
        if (primaryModel) {
            return primaryModel;
        }

        // If primary model not found and fallbacks are allowed, try fallbacks
        if (
            useFallback &&
            taskMapping.fallbackModelIds &&
            taskMapping.fallbackModelIds.length > 0
        ) {
            for (const fallbackId of taskMapping.fallbackModelIds) {
                const fallbackModel = this.getModelById(fallbackId);
                if (fallbackModel) {
                    console.warn(
                        `Primary model ${taskMapping.primaryModelId} not found for task ${taskName}, using fallback: ${fallbackId}`,
                    );
                    return fallbackModel;
                }
            }
        }

        // If no suitable model found, return default
        console.warn(
            `No suitable model found for task: ${taskName}, using default model`,
        );
        return this.getDefaultModel();
    }

    /**
     * Get all available task mappings
     */
    public getAllTaskMappings(): TaskModelMapping[] {
        this.ensureInitialized();
        return [...this.config.taskMappings];
    }

    /**
     * Get all available models
     */
    public getAllModels(): ModelConfig[] {
        this.ensureInitialized();
        return [...this.config.models];
    }

    /**
     * Ensure the registry is initialized before use
     */
    private ensureInitialized(): void {
        if (!this.isInitialized) {
            throw new Error(
                "Model registry not initialized. Call initialize() first.",
            );
        }
    }
}
