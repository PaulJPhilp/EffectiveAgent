/**
 * Base configuration interface for all configurations
 */
export interface BaseConfig {
    /** Name of the configuration */
    readonly name: string;
    /** Optional description of the configuration */
    readonly description?: string;
    /** Optional tags for configuration categorization */
    readonly tags?: readonly string[];
}
