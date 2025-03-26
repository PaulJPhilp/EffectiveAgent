import { ConfigurationLoader } from '../configuration/configurationLoader.js';
import { ConfigurationService } from '../configuration/configurationService.js';
import { ConfigurationError, type ConfigLoaderOptions, type ValidationResult } from '../configuration/types.js';
import type { ModelConfig, ModelConfigFile } from './schemas/modelConfig.js';
import { ModelConfigFileSchema } from './schemas/modelConfig.js';

/** Model configuration options */
interface ModelConfigurationOptions extends ConfigLoaderOptions {
    readonly configPath: string;
    readonly environment?: string;
}

/** Model configuration service */
export class ModelConfigurationService extends ConfigurationService<ModelConfigFile> {
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
            const rawConfig = this.loader.loadConfig(
                'models.json',
                {
                    schema: ModelConfigFileSchema,
                    required: true
                }
            );
            const parsedConfig = ModelConfigFileSchema.parse(rawConfig);
            this.config = parsedConfig;
        } catch (error) {
            throw new ConfigurationError({
                name: 'ModelConfigLoadError',
                message: `Failed to load model configurations: ${(error as Error).message}`,
                code: 'MODEL_CONFIG_LOAD_ERROR'
            });
        }
    }

    /** Get model configuration by ID */
    getModel(modelId: string): ModelConfig {
        const model = this.config?.models.find((model: ModelConfig) => model.id === modelId);
        if (!model) {
            throw new ConfigurationError({
                name: 'ModelNotFoundError',
                message: `Model configuration not found for ID: ${modelId}`,
                code: 'MODEL_NOT_FOUND_ERROR'
            });
        }
        return model;
    }

    /** Validate configuration */
    protected validateConfig(
        config: ModelConfigFile
    ): ValidationResult {
        try {
            ModelConfigFileSchema.parse(config);
            return { isValid: true };
        } catch (error) {
            return {
                isValid: false,
                errors: [error instanceof Error ? error.message : String(error)]
            };
        }
    }
}