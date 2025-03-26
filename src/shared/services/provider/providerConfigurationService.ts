import * as fs from 'fs/promises';
import * as path from 'path';
import { ProvidersFileSchema, type Provider, type ProvidersFile } from './schemas/index.ts';
import type { IProviderConfigurationService, ProviderConfigurationOptions } from './types.ts';

/**
 * Service for managing provider configurations
 */
export class ProviderConfigurationService implements IProviderConfigurationService {
    private readonly configPath: string;
    private providers: Provider[] = [];
    private providersFile?: ProvidersFile;
    private readonly debug = false;

    /**
     * Create a new ProviderConfigurationService
     * @param options Configuration options
     */
    constructor(options: ProviderConfigurationOptions) {
        this.configPath = options.configPath;
    }

    /**
     * Load provider configurations from file
     */
    public async loadConfigurations(): Promise<void> {
        const configPath = path.join(this.configPath, 'providers.json');

        try {
            // Read and parse config file
            const configContent = await fs.readFile(configPath, 'utf-8');
            const parsedConfig = JSON.parse(configContent);

            // Validate using schema
            const result = ProvidersFileSchema.safeParse(parsedConfig);

            if (!result.success) {
                throw new Error(`Invalid provider configuration: ${result.error.message}`);
            }

            this.providersFile = result.data;
            this.providers = [...this.providersFile.providers];

            if (this.debug) {
                console.log(`[ProviderConfigurationService] Loaded ${this.providers.length} providers`);
            }
        } catch (error) {
            if (this.debug) {
                console.error('[ProviderConfigurationService] Error loading configurations:', error);
            }
            throw new Error(`Failed to load provider configurations: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get provider configuration by ID
     * @throws Error if provider not found
     */
    public getProviderConfig(providerId: string): Provider {
        if (!this.providersFile) {
            throw new Error('Provider configurations not loaded');
        }

        const provider = this.providers.find(p => p.id === providerId);

        if (!provider) {
            throw new Error(`Provider not found: ${providerId}`);
        }

        return provider;
    }

    /**
     * Get default provider configuration
     * @throws Error if no default provider is set
     */
    public getDefaultProviderConfig(): Provider {
        if (!this.providersFile) {
            throw new Error('Provider configurations not loaded');
        }

        return this.getProviderConfig(this.providersFile.defaultProviderId);
    }

    /**
     * Get all provider configurations
     */
    public getAllProviderConfigs(): ReadonlyArray<Provider> {
        if (!this.providersFile) {
            throw new Error('Provider configurations not loaded');
        }

        return this.providers;
    }

    /**
     * Clear configuration cache
     */
    public clearCache(): void {
        this.providersFile = undefined;
        this.providers = [];
    }
} 