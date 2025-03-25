/** Base configuration interface */
export interface BaseConfig {
    readonly name: string
    readonly version: string
}

/** Environment configuration interface */
export interface EnvironmentConfig extends BaseConfig {
    readonly environment: string
}

/** Configuration loader options */
export interface ConfigLoaderOptions {
    readonly basePath: string
    readonly environment?: string
    readonly validateSchema?: boolean
}

/** Validation result */
export interface ValidationResult {
    readonly isValid: boolean
    readonly errors?: string[]
}

/** Configuration error */
export class ConfigurationError extends Error {
    readonly code: string
    constructor(options: { name: string; message: string; code: string }) {
        super(options.message)
        this.name = options.name;
        this.code = options.code;
    }
}