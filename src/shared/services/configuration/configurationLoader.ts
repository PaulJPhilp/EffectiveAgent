import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ZodError, type z } from 'zod';
import { type BaseConfig } from './types.js';
import { ConfigurationError, type ConfigLoaderOptions } from './types.js';

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
    loadConfig<T extends BaseConfig>(
        filename: string,
        options: LoadOptions = {}
    ): T {
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
            this.validateConfig(config, options.schema);
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
        if (typeof config !== 'object' || config === null) {
            throw new ConfigurationError({
                name: 'InvalidConfigType',
                message: 'Configuration must be an object',
                code: 'INVALID_CONFIG_TYPE'
            });
        }
        try {
            await schema.parseAsync(config);
        } catch (error) {
            if (error instanceof ZodError) {
                const errorMessage = error.errors.map(e => e.message).join('\n');
                throw new ConfigurationError({
                    name: 'ConfigValidationError',
                    message: `Invalid configuration: ${errorMessage}`,
                    code: 'CONFIG_VALIDATION_ERROR'
                });
            }
            throw new ConfigurationError({
                name: 'ConfigValidationError',
                message: `Invalid configuration: ${error instanceof Error ? error.message : String(error)}`,
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
