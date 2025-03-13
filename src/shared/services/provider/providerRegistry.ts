import fs from "node:fs"
import path from "node:path"
import type { ProviderConfig, ProvidersConfig } from "../../schemas/providerConfig.js"
import { ProvidersConfigSchema } from "../../schemas/providerConfig.js"

/**
 * Service for managing provider configurations
 */
export class ProviderRegistryService {
    private static instance: ProviderRegistryService
    private config: ProvidersConfig
    private providersConfigPath: string
    private isInitialized = false

    private constructor() {
        this.providersConfigPath = path.join(process.cwd(), "src", "shared", "config", "providers.json")
        this.config = {
            providers: [],
            defaultProviderId: "openai"
        }
    }

    /**
     * Get singleton instance of ProviderRegistryService
     */
    public static async getInstance(): Promise<ProviderRegistryService> {
        if (!ProviderRegistryService.instance) {
            ProviderRegistryService.instance = new ProviderRegistryService()
            await ProviderRegistryService.instance.initialize()
        }
        return ProviderRegistryService.instance
    }

    /**
     * Initialize the provider registry
     */
    private async initialize(): Promise<void> {
        if (this.isInitialized) return

        try {
            const configData = await fs.promises.readFile(this.providersConfigPath, "utf-8")
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