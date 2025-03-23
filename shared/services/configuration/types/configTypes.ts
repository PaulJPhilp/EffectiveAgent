/** Base configuration interface */
export interface BaseConfig {
    readonly name: string;
    readonly version: string;
}

/** Environment-specific configuration */
export interface EnvironmentConfig extends BaseConfig {
    readonly environment: 'development' | 'production' | 'test';
    readonly debug?: boolean;
}

/** Configuration error options */
export interface ConfigErrorOptions {
    readonly name: string;
    readonly message: string;
    readonly code?: string;
}

/** Custom error for configuration issues */
export class ConfigurationError extends Error {
    readonly code?: string;

    constructor(options: ConfigErrorOptions) {
        super(options.message);
        this.name = options.name;
        this.code = options.code;
    }
}

/** Configuration validation result */
export interface ValidationResult {
    readonly isValid: boolean;
    readonly errors?: readonly string[];
}

/** Configuration loader options */
export interface ConfigLoaderOptions {
    readonly basePath: string;
    readonly environment?: string;
    readonly validateSchema?: boolean;
}
