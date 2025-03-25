import type { AgentConfig } from "../../../agents/agent-service/types.js";
import { ConfigurationError } from '../configuration/types.js';
import { ProviderConfigurationService } from "./providerConfigurationService.js";
import { type Provider } from "./schemas/providerConfig.js";

/**
 * Service for managing provider agentconfigurations
 */
export class ProviderRegistryService {
    private readonly debug: boolean;
    private agentConfig: AgentConfig;
    private providerConfigService: ProviderConfigurationService;
    private providers: Provider[];
    constructor(agentConfig: AgentConfig) {
        this.debug = agentConfig.debug || false;
        this.agentConfig = agentConfig;
        if (this.debug) {
            console.log('[ProviderRegistryService] Initializing');
        }
        this.providerConfigService = new ProviderConfigurationService({
            configPath: this.agentConfig.configFiles.providers,
            environment: this.agentConfig.environment
        });
        this.providerConfigService.loadConfigurations()
            .then(() => {
                if (this.debug) {
                    console.log('[ProviderRegistryService] Provider configurations loaded');
                }
            })
            .catch(error => {
                throw new ConfigurationError({
                    name: 'ProviderConfigLoadError',
                    message: `Failed to load provider configurations: ${error instanceof Error ? error.message : String(error)}`,
                    code: 'PROVIDER_CONFIG_LOAD_ERROR'
                });
            });

        this.providers = [...this.providerConfigService.getAllProviderConfigs()];

        if (this.providers.length === 0) {
            throw new Error("No providers found in registry");
        }

        if (this.debug) {
            console.log(`[ProviderRegistryService] Initialized with ${this.providers.length} providers`);
        }
    }
    /**
     * Initialize the provider registry
     */
    /**
     * Get provider agentconfiguration by ID
     * @throws Error if provider not found
     */
    public getProviderConfig(providerId: string): Provider {
        if (this.debug) {
            console.log(`[ProviderRegistryService] Getting provider by ID: |${providerId}|`);
            console.log(`[ProviderRegistryService] Available providers: |${this.providers.map(p => p.id).join('|, |')}|`);
        }
        const provider = this.providers.find(p => p.id === providerId);
        if (!provider) {
            throw new Error(`Provider not found with ID: ${providerId}`);
        }
        return provider;
    }

    /**
     * Get the default provider agentconfiguration
     * @throws Error if no default provider is set
     */
    public getDefaultProvider(): Provider {
        const defaultProviderId = this.providerConfigService.getDefaultProviderConfig().id;
        return this.getProviderConfig(defaultProviderId);
    }

    /**
     * Check if a provider exists by ID
     */
    public hasProvider(providerId: string): boolean {
        return this.providers.some(p => p.id === providerId);
    }

    /**
     * Get all provider agentconfigurations
     */
    public getAllProviders(): Provider[] {
        return [...this.providers];
    }
} 