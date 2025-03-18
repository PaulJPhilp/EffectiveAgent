import fs from "node:fs"
import path, { join } from "node:path"
import type { ProviderConfig, ProvidersConfig } from "./schemas/providerConfig.js"
import { ProvidersConfigSchema } from "./schemas/providerConfig.js"

export interface ProviderRegistryOptions {
    readonly providersConfigPath: string;
}


/**
 * Service for managing provider configurations
 */
export class ProviderRegistryService {
    private config: ProvidersConfig = {
        providers: [],
        defaultProviderId: "openai"
    }
    private providersConfigPath: string
    private isInitialized = false

    constructor(options: ProviderRegistryOptions) {
        this.providersConfigPath = options.providersConfigPath
        this.initialize();
        if (this.config.providers.length === 0) {
            throw new Error("No providers found in registry");
        }
    }
    /**
     * Initialize the provider registry
     */
    private async initialize(): Promise<void> {
        if (this.isInitialized) return

        try {
            console.log(`[ProviderRegistryService] Initialize() with config path: ${this.providersConfigPath}`);
            const configPath = join(this.providersConfigPath, "providers.json")
            console.log(`[ProviderRegistryService] Config path: ${configPath}`);
            if (!fs.existsSync(configPath)) {
                throw new Error(`Providers configuration file not found: ${configPath}`);
            }
            const configData = fs.readFileSync(configPath, "utf-8")
            console.log(`[ProviderRegistryService] Config data: ${JSON.stringify(configData)}`);
            const parsedConfig = JSON.parse(configData)
            this.config = ProvidersConfigSchema.parse(parsedConfig)
            this.isInitialized = true
        } catch (error) {
            console.error("Failed to initialize provider registry:", error)
            throw new Error("Failed to initialize provider registry")
        }
    }

    /**
     * Get provider configuration by ID
     */
    public getProviderConfig(providerId: string): ProviderConfig | undefined {
        console.log(`[ProviderRegistryService] Getting provider by ID: |${providerId}|`);
        console.log(`[ProviderRegistryService] Available providers: |${this.config.providers.map(p => p.id).join('|, |')}|`);
        return this.config.providers.find(p => p.id === providerId)
    }

    /**
     * Get all provider configurations
     */
    public getAllProviders(): ProviderConfig[] {
        return [...this.config.providers]
    }

    /**
     * Get default provider configuration
     */
    public getDefaultProvider(): ProviderConfig {
        const defaultProvider = this.getProviderConfig(this.config.defaultProviderId)
        if (!defaultProvider) {
            throw new Error("Default provider not found")
        }
        return defaultProvider
    }
} 