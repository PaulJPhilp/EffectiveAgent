import fs from "node:fs"
import path, { join } from "node:path"
import type { ProviderConfig, ProvidersConfig } from "./schemas/providerConfig.js"
import { ProvidersConfigSchema } from "./schemas/providerConfig.js"

import type { AgentConfig } from "../../../agents/config/config-types.js";

/**
 * Service for managing provider configurations
 */
export class ProviderRegistryService {
    private readonly debug: boolean = false;
    private config: ProvidersConfig;
    private isInitialized = false;

    constructor(config: AgentConfig) {
        if (this.debug) {
            console.log('[ProviderRegistryService] Initializing');
        }
        
        // Convert provider configurations from AgentConfig format
        const providers = Object.entries(config.providers).map(([id, provider]) => ({
            id,
            name: provider.name,
            type: provider.name.toLowerCase() as "openai" | "anthropic" | "google" | 
                "local" | "grok" | "deepseek",
            apiVersion: "v1", // Default API version
            rateLimit: {
                requestsPerMinute: 60 // Default rate limit
            }
        }));
        
        this.config = {
            name: config.name,
            version: config.version,
            providers,
            defaultProviderId: providers[0]?.id || "openai"
        };
        
        if (this.config.providers.length === 0) {
            throw new Error("No providers found in registry");
        }
        
        if (this.debug) {
            console.log(`[ProviderRegistryService] Initialized with ${providers.length} providers`);
        }
    }
    /**
     * Initialize the provider registry
     */
    /**
     * Get provider configuration by ID
     * @throws Error if provider not found
     */
    public getProviderConfig(providerId: string): ProviderConfig {
        if (this.debug) {
            console.log(`[ProviderRegistryService] Getting provider by ID: |${providerId}|`);
            console.log(`[ProviderRegistryService] Available providers: |${this.config.providers.map(p => p.id).join('|, |')}|`);
        }
        const provider = this.config.providers.find(p => p.id === providerId);
        if (!provider) {
            throw new Error(`Provider not found with ID: ${providerId}`);
        }
        return provider;
    }

    /**
     * Get the default provider configuration
     * @throws Error if no default provider is set
     */
    public getDefaultProvider(): ProviderConfig {
        return this.getProviderConfig(this.config.defaultProviderId);
    }

    /**
     * Check if a provider exists by ID
     */
    public hasProvider(providerId: string): boolean {
        return this.config.providers.some(p => p.id === providerId);
    }

    /**
     * Get all provider configurations
     */
    public getAllProviders(): ProviderConfig[] {
        return [...this.config.providers];
    }
} 