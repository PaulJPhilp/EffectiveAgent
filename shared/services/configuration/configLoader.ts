import type { z } from 'zod';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { BaseConfig } from './types/baseConfig.js';
import type { ModelsConfig } from './types/modelConfig.js';
import { ModelsSchema } from './schemas/modelSchemas.js';
import { ProvidersConfigSchema } from './schemas/providerSchemas.js';
import type { ProvidersConfig } from './schemas/providerSchemas.js';
import { PromptsSchema } from './schemas/promptSchemas.js';
import type { PromptsConfig } from './types/promptConfig.js';

/**
 * Configuration loader options
 */
export interface ConfigLoaderOptions {
    readonly basePath: string;
    readonly validateSchema?: boolean;
}

/**
 * Load options with schema validation
 */
export interface LoadOptions<T> {
    readonly schema?: z.ZodType<T>;
    readonly required?: boolean;
    readonly validate?: boolean;
}

/**
 * Configuration loader for managing and validating configurations
 */
export class ConfigLoader {
    private readonly basePath: string;
    private readonly validateOnLoad: boolean;
    private readonly cache = new Map<string, unknown>();

    /**
     * Create a new configuration loader
     * @param options Loader options
     */
    constructor(options: ConfigLoaderOptions) {
        this.basePath = options.basePath;
        this.validateOnLoad = options.validateSchema ?? true;
    }

    /**
     * Load and validate configuration
     * @param filename Configuration file name
     * @param options Load options
     * @returns Loaded configuration
     */
    public  loadConfig<T extends BaseConfig>(filename: string, options: LoadOptions<T> = {}): T {
        const filePath: string = join(this.basePath, filename);
        const cached: T | undefined = this.cache.get(filePath) as T | undefined;
        if (cached) {
            return cached;
        }

        const content: string = readFileSync(filePath, 'utf-8');
        const config: T = JSON.parse(content) as T;

        if (options.validate ?? this.validateOnLoad) {
            if (!options.schema) {
                throw new Error('Schema required for validation');
            }
            const result = options.schema.safeParse(config);
            if (!result.success) {
                const errors: string = handleZodError(result.error);
                throw new Error(`Invalid configuration: ${errors}`);
            }
        }

        this.cache.set(filePath, config);
        return config;
    }

    /**
     * Clear configuration cache
     */
    public clearCache(): void {
        this.cache.clear();
    }

    /**
     * Load models configuration
     * @param filename The models configuration filename (default: 'models.json')
     * @returns The loaded models configuration
     */
    public  loadModelsConfig(filename = 'models.json'): ModelsConfig {
        const filePath: string = join(this.basePath, filename);
        const cached: ModelsConfig | undefined = this.cache.get(filePath) as ModelsConfig | undefined;
        if (cached) {
            return cached;
        }

        const content: string = readFileSync(filePath, 'utf-8');
        const config: ModelsConfig = JSON.parse(content) as ModelsConfig;

        // Validate the config against the schema
        const result = ModelsSchema.safeParse(config);
        if (!result.success) {
            const errors: string = handleZodError(result.error);
            throw new Error(`Invalid models configuration: ${errors}`);
        }

        this.cache.set(filePath, config);
        return config;
    }

    /**
     * Load providers configuration
     * @param filename The providers configuration filename (default: 'providers.json')
     * @returns The loaded providers configuration
     */
    public  loadProvidersConfig(filename = 'providers.json'): ProvidersConfig {
        const filePath: string = join(this.basePath, filename);
        const cached: ProvidersConfig | undefined = this.cache.get(filePath) as ProvidersConfig | undefined;
        if (cached) {
            return cached;
        }

        const content: string = readFileSync(filePath, 'utf-8');
        const config: ProvidersConfig = JSON.parse(content) as ProvidersConfig;

        // Validate the config against the schema
        const result = ProvidersConfigSchema.safeParse(config);
        if (!result.success) {
            const errors: string = handleZodError(result.error);
            throw new Error(`Invalid providers configuration: ${errors}`);
        }

        this.cache.set(filePath, config);
        return config;
    }
    
    /**
     * Load prompts configuration
     * @param filename The prompts configuration filename (default: 'prompts.json')
     * @returns The loaded prompts configuration
     */
    public  loadPromptsConfig(filename = 'prompts.json'): PromptsConfig {
        const filePath: string = join(this.basePath, filename);
        const cached: PromptsConfig | undefined = this.cache.get(filePath) as PromptsConfig | undefined;
        if (cached) {
            return cached;
        }

        const content: string = readFileSync(filePath, 'utf-8');
        const config: PromptsConfig = JSON.parse(content) as PromptsConfig;

        // Validate the config against the schema
        const result = PromptsSchema.safeParse(config);
        if (!result.success) {
            const errors: string = handleZodError(result.error);
            throw new Error(`Invalid prompts configuration: ${errors}`);
        }

        this.cache.set(filePath, config);
        return config;
    }

    private handleError(err: Error): void {
        console.error(err);
    }
}

// Update error handling to match Zod's expected types
const handleZodError = (err: z.ZodError): string => {
    return err.errors.map((issue) => issue.message).join(', ');
};
