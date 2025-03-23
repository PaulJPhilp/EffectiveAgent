import type { z } from 'zod';
import type { ValidationResult } from '../configuration';
import {
    ConfigurationError,
    ConfigurationLoader,
    ConfigurationService
} from '../configuration';
import type {
    ContextWindowSize,
    ModelCapability,
    ModelConfig,
    ModelsConfig,
    ThinkingLevel
} from './schemas/modelConfig';
import { ModelsConfigSchema } from './schemas/modelConfig';

/** Model configuration options */
interface ModelConfigurationOptions {
    readonly configPath: string;
    readonly environment?: string;
}

/** Model configuration service */
export class ModelConfigurationService extends ConfigurationService<ModelsConfig> {
    private readonly loader: ConfigurationLoader;

    constructor(options: ModelConfigurationOptions) {
        super({ validateOnLoad: true });
        this.loader = new ConfigurationLoader({
            basePath: options.configPath,
            environment: options.environment,
            validateSchema: true
        });
    }

    /** Load model configurations */
    async loadConfigurations(): Promise<void> {
        try {
            const rawConfig = await this.loader.loadConfig(
                'models.json',
                {
                    schema: ModelsConfigSchema,
                    required: true
                }
            );
            const parsedConfig = ModelsConfigSchema.parse(rawConfig);
            await this.loadConfig(parsedConfig);
        } catch (error) {
            throw new ConfigurationError({
                name: 'ModelConfigLoadError',
                message: `Failed to load model configurations: ${error.message}`,
                code: 'MODEL_CONFIG_LOAD_ERROR'
            });
        }
    }

    /** Get model configuration by ID */
    getModelConfig(modelId: string): ModelConfig {
        const config = this.getConfig();

        for (const group of Object.values(config.groups)) {
            const model = group.models[modelId];
            if (model) { return model; }
        }

        throw new ConfigurationError({
            name: 'ModelNotFoundError',
            message: `Model not found: ${modelId}`,
            code: 'MODEL_NOT_FOUND'
        });
    }

    /** Get models by capability */
    getModelsByCapability(
        capability: ModelCapability
    ): ReadonlyArray<ModelConfig> {
        const config = this.getConfig();
        return Object.values(config.groups)
            .flatMap(group => Object.values(group.models))
            .filter(model => model.capabilities.includes(capability));
    }

    /** Get models by thinking level */
    getModelsByThinkingLevel(
        level: ThinkingLevel
    ): ReadonlyArray<ModelConfig> {
        const config = this.getConfig();
        return Object.values(config.groups)
            .flatMap(group => Object.values(group.models))
            .filter(model => model.capabilities.includes('reasoning') &&
                model.metadata?.thinkingLevel === level);
    }

    /** Get models by context window size */
    getModelsByContextWindow(
        size: ContextWindowSize
    ): ReadonlyArray<ModelConfig> {
        const config = this.getConfig();
        return Object.values(config.groups)
            .flatMap(group => Object.values(group.models))
            .filter(model => model.contextWindowSize === size);
    }

    /** Clear configuration cache */
    clearCache(): void {
        this.loader.clearCache();
        this.clearConfig();
    }

    /** Validate configuration */
    protected async validateConfig(
        config: z.infer<typeof ModelsConfigSchema>
    ): Promise<ValidationResult> {
        try {
            await ModelsConfigSchema.parseAsync(config);
            return { isValid: true };
        } catch (error) {
            return {
                isValid: false,
                errors: [error.message]
            };
        }
    }
}