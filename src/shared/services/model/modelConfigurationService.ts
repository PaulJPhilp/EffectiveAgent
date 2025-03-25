import { ConfigurationLoader } from '../configuration/configurationLoader.js';
import { ConfigurationService } from '../configuration/configurationService.js';
import { ConfigurationError, type ConfigLoaderOptions, type ValidationResult } from '../configuration/types.js';
import type {
    ModelConfig
} from './schemas/modelConfig.js';
import type { ModelRegistryConfig } from './schemas/modelRegistry.js';
import { ModelRegistryConfigSchema } from './schemas/modelRegistry.js';

/** Model configuration options */
interface ModelConfigurationOptions extends ConfigLoaderOptions {
    readonly configPath: string;
    readonly environment?: string;
}

/** Model configuration service */
export class ModelConfigurationService extends ConfigurationService<ModelRegistryConfig> {
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
                    schema: ModelRegistryConfigSchema,
                    required: true
                }
            );
            const parsedConfig = ModelRegistryConfigSchema.parse(rawConfig);
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
        const model = this.config?.models.find(model => model.id === modelId);
        if (!model) {
            throw new ConfigurationError({
                name: 'ModelNotFoundError',
                message: `Model configuration not found for ID: ${modelId}`,
                code: 'MODEL_NOT_FOUND_ERROR'
            });
        }
        return model;
    }

    /** Clear configuration cache */
    clearCache(): void {
        this.loader.clearCache();
        this.clearConfig();
    }
    /** Validate configuration */
    protected validateConfig(
        config: ModelRegistryConfig
    ): ValidationResult {
        try {
            ModelRegistryConfigSchema.parse(config);
            return { isValid: true };
        } catch (error) {
            return {
                isValid: false,
                errors: [error instanceof Error ? error.message : String(error)]
            };
        }
    }
}