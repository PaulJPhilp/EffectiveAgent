import type { ModelConfig } from '@services/model/schemas/modelConfig.js';
import { ModelsSchema } from '@services/model/schemas/modelConfig.ts';
import type { PromptConfig } from '@services/prompt/schemas/promptConfig.js';
import { PromptFileSchema } from '@services/prompt/schemas/promptConfig.ts';
import { ProvidersFileSchema, type Providers } from '@services/provider/schemas/providerConfig.ts';
import { TaskFileSchema, type Tasks } from '@services/task/schemas/taskSchemas.ts';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { z } from 'zod';
import type { BaseConfig } from './schemas/baseSchemas.ts';

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
    public loadConfig<T extends BaseConfig>(filename: string, options: LoadOptions<T> = {}): T {
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
    public loadModelsConfig(filename = 'models.json'): ModelConfig {
        const filePath: string = join(this.basePath, filename);
        const cached: ModelConfig | undefined = this.cache.get(filePath) as ModelConfig | undefined;
        if (cached) {
            return cached;
        }

        const content: string = readFileSync(filePath, 'utf-8');
        const config: ModelConfig = JSON.parse(content) as ModelConfig;

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
    public loadProvidersConfig(filename = 'providers.json'): Providers {
        const filePath: string = join(this.basePath, filename);
        const cached: Providers | undefined = this.cache.get(filePath) as Providers | undefined;
        if (cached) {
            return cached;
        }

        const content: string = readFileSync(filePath, 'utf-8');
        const config: Providers = JSON.parse(content) as Providers;

        // Validate the config against the schema
        const result = ProvidersFileSchema.safeParse(config);
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
    public loadPromptsConfig(filename = 'prompts.json'): Record<string, PromptConfig> {
        const filePath: string = join(this.basePath, filename);
        const cached = this.cache.get(filePath) as Record<string, PromptConfig> | undefined;
        if (cached) {
            return cached;
        }

        const content: string = readFileSync(filePath, 'utf-8');
        const config = JSON.parse(content) as Record<string, PromptConfig>;

        // Validate each prompt config against the schema
        for (const [key, value] of Object.entries(config)) {
            const result = PromptFileSchema.safeParse(value);
            if (!result.success) {
                const errors: string = handleZodError(result.error);
                throw new Error(`Invalid prompt configuration for ${key}: ${errors}`);
            }
        }

        this.cache.set(filePath, config);
        return config;
    }

    /**
     * Load prompts configuration
     * @param filename The task configuration filename (default: 'tasks.json')
     * @returns The loaded prompts configuration
     */
    public loadTasks(filename = 'tasks.json'): Tasks {
        const filePath: string = join(this.basePath, filename);
        const cached: Tasks = this.cache.get(filePath) as Tasks;

        if (cached) {
            return cached;
        }

        const content = readFileSync(filePath, 'utf-8');
        const taskFile = JSON.parse(content) as Tasks;

        // Validate the config against the schema
        const result = TaskFileSchema.safeParse(taskFile);
        if (!result.success) {
            const errors: string = handleZodError(result.error);
            throw new Error(`Invalid task file configuration: ${errors}`);
        }

        this.cache.set(filePath, taskFile);
        return taskFile;
    }

}

// Update error handling to match Zod's expected types
const handleZodError = (err: z.ZodError): string => {
    return err.errors.map((issue) => issue.message).join(', ');
};