import type { AgentConfig } from '../../../agents/config/config-types.js';
import type { BaseModelProvider } from './modelProvider.js';
import { ConfigurationError } from '../configuration/index.js';
import { ProviderFactory } from './providerFactory.js';
import { ProviderRegistryService } from './providerRegistry.js';

/**
 * Error thrown when provider is not found
 */
export class ProviderNotFoundError extends Error {
    readonly code = 'PROVIDER_NOT_FOUND';
    readonly provider: string;

    constructor(provider: string) {
        super(`Provider not found: ${provider}`);
        this.name = 'ProviderNotFoundError';
        this.provider = provider;
    }
}

/**
 * Error thrown when provider authentication fails
 */
export class ProviderAuthenticationError extends Error {
    readonly code = 'PROVIDER_AUTH_ERROR';
    readonly provider: string;

    constructor(provider: string, message: string) {
        super(`Authentication failed for provider ${provider}: ${message}`);
        this.name = 'ProviderAuthenticationError';
        this.provider = provider;
    }
}

/**
 * Service for managing model providers
 * Integrates with the configuration system for provider management
 */
export class ProviderService {
    private readonly debug: boolean;
    private readonly factory: ProviderFactory;
    private readonly registry: ProviderRegistryService;

    constructor(config: AgentConfig) {
        this.debug = false;
        this.factory = new ProviderFactory(config);
        this.registry = new ProviderRegistryService(config);

        if (this.debug) {
            console.log(`[ProviderService] Initialized for agent: ${config.name}`);
        }
    }

    /**
     * Get a provider by name
     * @throws ProviderNotFoundError if provider doesn't exist
     */
    public getProvider(name: string): BaseModelProvider {
        if (this.debug) {
            console.log(`[ProviderService] Getting provider: ${name}`);
        }

        try {
            const providerConfig = this.registry.getProviderConfig(name);
            const defaultProvider = this.registry.getDefaultProvider();
            const modelId = defaultProvider.id === name ? 
                defaultProvider.id : 
                providerConfig.id;
            return this.factory.createProviderForModelId(modelId);
        } catch (error) {
            if (error instanceof ConfigurationError) {
                throw new ProviderNotFoundError(name);
            }
            throw error;
        }
    }

    /**
     * Get the provider for a specific model
     * @throws ProviderNotFoundError if provider doesn't exist
     */
    public getProviderForModel(modelId: string): BaseModelProvider {
        try {
            return this.factory.createProviderForModelId(modelId);
        } catch (error) {
            if (error instanceof ConfigurationError) {
                throw new ProviderNotFoundError(modelId);
            }
            throw error;
        }
    }

    /**
     * Validate if a provider exists and is properly configured
     */
    public validateProvider(provider: string): boolean {
        try {
            return this.registry.hasProvider(provider);
        } catch (error) {
            return false;
        }
    }
}
