/**
 * Configuration types for AI providers
 */
import type { BaseConfig } from './baseConfig';
import type { ModelParameters } from './modelConfig';

/**
 * Provider model configuration
 */
export interface ProviderModelConfig extends ModelParameters {
  /** Name of the model */
  readonly name: string;
}

/**
 * Provider configuration
 */
export interface ProviderConfig extends BaseConfig {
  /** Models available from this provider */
  readonly models: Record<string, ProviderModelConfig>;
}

/**
 * Complete providers configuration
 */
export interface ProvidersConfig {
  /** Providers indexed by their ID */
  [providerId: string]: ProviderConfig;
}
