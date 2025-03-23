import type { z } from 'zod';
import {
    ConfigurationLoader,
    ConfigurationError
} from '../configuration';

import  {
   type  ProviderConfigSchema,
    ProvidersConfigSchema
} from './schemas/providerConfig';

/** Provider configuration options */
interface ProviderConfigurationOptions {
    readonly configPath: string;
    readonly environment?: string;
}

/** Provider configuration service */
export class ProviderConfigurationService {
    private readonly loader: ConfigurationLoader;
    private providersConfig?: z.infer<typeof ProvidersConfigSchema>;

    constructor(options: ProviderConfigurationOptions) {
        this.loader = new ConfigurationLoader({
            basePath: options.configPath,
            environment: options.environment,
            validateSchema: true
        });
    }

    /** Load provider configurations */
    async loadConfigurations(): Promise<void> {
        try {
            this.providersConfig = await this.loader.loadConfig(
                'providers.json',
                {
                    schema: ProvidersConfigSchema,
                    required: true
                }
            );
        } catch (error) {
            throw new ConfigurationError({
                name: 'ProviderConfigLoadError',
                message: `Failed to load provider configurations: ${error.message}`,
                code: 'PROVIDER_CONFIG_LOAD_ERROR'
            });
        }
    }

    /** Get provider configuration by ID */
    getProviderConfig(
        providerId: string
    ): z.infer<typeof ProviderConfigSchema> {
        if (!this.providersConfig) {
            throw new ConfigurationError({
                name: 'ProviderConfigNotLoadedError',
                message: 'Provider configurations not loaded',
                code: 'PROVIDER_CONFIG_NOT_LOADED'
            });
        }

        const provider = this.providersConfig.providers.find(
            p => p.id === providerId
        );
        if (!provider) {
            throw new ConfigurationError({
                name: 'ProviderNotFoundError',
                message: `Provider not found: ${providerId}`,
                code: 'PROVIDER_NOT_FOUND'
            });
        }

        return provider;
    }

    /** Get default provider configuration */
    getDefaultProviderConfig(): z.infer<typeof ProviderConfigSchema> {
        if (!this.providersConfig) {
            throw new ConfigurationError({
                name: 'ProviderConfigNotLoadedError',
                message: 'Provider configurations not loaded',
                code: 'PROVIDER_CONFIG_NOT_LOADED'
            });
        }

        return this.getProviderConfig(this.providersConfig.defaultProviderId);
    }

    /** Get all provider configurations */
    getAllProviderConfigs(): ReadonlyArray<z.infer<typeof ProviderConfigSchema>> {
        if (!this.providersConfig) {
            throw new ConfigurationError({
                name: 'ProviderConfigNotLoadedError',
                message: 'Provider configurations not loaded',
                code: 'PROVIDER_CONFIG_NOT_LOADED'
            });
        }

        return this.providersConfig.providers;
    }

    /** Clear configuration cache */
    clearCache(): void {
        this.loader.clearCache();
        this.providersConfig = undefined;
    }
}
