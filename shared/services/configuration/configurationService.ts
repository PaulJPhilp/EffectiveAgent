import type { BaseConfig, ValidationResult } from './types/configTypes';
import { ConfigurationError } from './types/configTypes';

/** Configuration service options */
interface ConfigurationServiceOptions {
    readonly validateOnLoad?: boolean;
}

/**
 * Base configuration service that provides configuration management and validation.
 * @template T Configuration type that extends BaseConfig
 */
export abstract class ConfigurationService<T extends BaseConfig> {
    protected config?: T;
    private readonly validateOnLoad: boolean;

    /**
     * Create a new configuration service instance
     * @param options Service configuration options
     */
    constructor(options: ConfigurationServiceOptions = {}) {
        this.validateOnLoad = options.validateOnLoad ?? true;
    }

    /**
     * Load and validate configuration
     * @param config Configuration to load
     * @returns Validated configuration
     * @throws ConfigurationError if validation fails
     */
    async loadConfig(config: T): Promise<T> {
        if (this.validateOnLoad) {
            const result = await this.validateConfig(config);
            if (!result.isValid) {
                throw new ConfigurationError({
                    name: 'ValidationError',
                    message: `Invalid configuration: ${result.errors?.join(', ')}`,
                    code: 'CONFIG_INVALID'
                });
            }
        }
        this.config = config;
        return config;
    }

    /**
     * Get current configuration
     * @returns Current configuration
     * @throws ConfigurationError if configuration not loaded
     */
    getConfig(): T {
        if (!this.config) {
            throw new ConfigurationError({
                name: 'ConfigNotLoadedError',
                message: 'Configuration not loaded',
                code: 'CONFIG_NOT_LOADED'
            });
        }
        return this.config;
    }

    /**
     * Clear current configuration
     */
    clearConfig(): void {
        this.config = undefined;
    }

    /**
     * Validate configuration
     * @param config Configuration to validate
     * @returns Validation result
     */
    protected abstract validateConfig(config: T): Promise<ValidationResult>;
}
