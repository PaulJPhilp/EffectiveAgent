import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { z } from 'zod';
import type { 
    ConfigLoaderOptions,
    BaseConfig,
    ValidationResult 
} from './types/configTypes';
import { ConfigurationError } from './types/configTypes';

/** Configuration cache entry */
interface ConfigCacheEntry<T> {
    readonly config: T;
    readonly timestamp: number;
}

/** Configuration loader options with validation */
interface LoadOptions {
    readonly validate?: boolean;
    readonly schema?: z.ZodType<unknown>;
    readonly required?: boolean;
}

/** Enhanced configuration loader */
export class ConfigurationLoader {
    private readonly basePath: string;
    private readonly environment: string;
    private readonly validateOnLoad: boolean;
    private readonly cache: Map<string, ConfigCacheEntry<unknown>>;

    constructor(options: ConfigLoaderOptions) {
        this.basePath = options.basePath;
        this.environment = options.environment ?? 'development';
        this.validateOnLoad = options.validateSchema ?? true;
        this.cache = new Map();
    }

    /** Load configuration with schema validation */
    async loadConfig<T extends BaseConfig>(
        filename: string,
        options: LoadOptions = {}
    ): Promise<T> {
        const filepath = this.resolveFilePath(filename);
        const cached = this.getCachedConfig<T>(filepath);
        if (cached) { return cached; }

        if (options.required && !existsSync(filepath)) {
            throw new ConfigurationError({
                name: 'ConfigNotFoundError',
                message: `Required config not found: ${filepath}`,
                code: 'CONFIG_NOT_FOUND'
            });
        }

        const config = this.parseJsonFile<T>(filepath);
        if (options.validate ?? this.validateOnLoad) {
            await this.validateConfig(config, options.schema);
        }

        this.cacheConfig(filepath, config);
        return config;
    }

    /** Load environment-specific configuration */
    async loadEnvironmentConfig<T extends BaseConfig>(
        baseFilename: string,
        options: LoadOptions = {}
    ): Promise<T> {
        const envFilename = this.getEnvironmentFilename(baseFilename);
        return this.loadConfig<T>(envFilename, options);
    }

    /** Clear configuration cache */
    clearCache(): void {
        this.cache.clear();
    }

    /** Resolve absolute file path */
    private resolveFilePath(filename: string): string {
        const resolvedFilename = filename.endsWith('.json')
            ? filename
            : `${filename}.json`
        return join(this.basePath, resolvedFilename)
    }

    /** Get environment-specific filename */
    private getEnvironmentFilename(baseFilename: string): string {
        const ext = '.json';
        const name = baseFilename.replace(ext, '');
        return `${name}.${this.environment}${ext}`;
    }

    /** Parse JSON file with error handling */
    private parseJsonFile<T>(filepath: string): T {
        try {
            const content = readFileSync(filepath, 'utf-8');
            return JSON.parse(content) as T;
        } catch (error) {
            if (!existsSync(filepath)) {
                throw new ConfigurationError({
                    name: 'ConfigNotFoundError',
                    message: `Config not found: ${filepath}`,
                    code: 'CONFIG_NOT_FOUND'
                });
            }
            throw new ConfigurationError({
                name: 'ConfigParseError',
                message: `Failed to parse config: ${filepath}`,
                code: 'CONFIG_PARSE_ERROR'
            });
        }
    }

    /** Validate configuration with schema */
    private async validateConfig(
        config: unknown,
        schema?: z.ZodType<unknown>
    ): Promise<void> {
        if (!schema) { return; }
        
        try {
            await schema.parseAsync(config);
        } catch (error) {
            throw new ConfigurationError({
                name: 'ConfigValidationError',
                message: `Invalid configuration: ${error.message}`,
                code: 'CONFIG_VALIDATION_ERROR'
            });
        }
    }

    /** Get cached configuration */
    private getCachedConfig<T>(
        filepath: string
    ): T | undefined {
        const cached = this.cache.get(filepath);
        if (!cached) { return undefined; }

        const stats = existsSync(filepath)
            ? statSync(filepath).mtime.getTime()
            : 0;

        if (stats > cached.timestamp) {
            this.cache.delete(filepath);
            return undefined;
        }

        return cached.config as T;
    }

    /** Cache configuration */
    private cacheConfig<T>(
        filepath: string,
        config: T
    ): void {
        const timestamp = existsSync(filepath)
            ? statSync(filepath).mtime.getTime()
            : Date.now();

        this.cache.set(filepath, { config, timestamp });
    }
}
