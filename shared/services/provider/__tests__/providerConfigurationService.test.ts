import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationError } from '../../configuration'
import type { BaseConfig } from '../../configuration/types/configTypes'
import { ProviderConfigurationService } from '../providerConfigurationService'
import type { ProviderConfig } from '../schemas/providerConfig'

interface ProvidersConfig extends BaseConfig {
    readonly providers: ProviderConfig[];
    readonly defaultProviderId: string;
}

// Test fixture data
const mockProvidersConfig: ProvidersConfig = {
    name: 'Test Providers Config',
    version: '1.0',
    providers: [
        {
            id: 'openai',
            name: 'OpenAI',
            type: 'openai',
            apiVersion: 'v1',
            baseUrl: 'https://api.openai.com',
            defaultHeaders: {
                'Authorization': 'Bearer ${OPENAI_API_KEY}'
            },
            rateLimit: {
                requestsPerMinute: 60,
                tokensPerMinute: 40000
            }
        },
        {
            id: 'anthropic',
            name: 'Anthropic',
            type: 'anthropic',
            apiVersion: 'v1',
            baseUrl: 'https://api.anthropic.com',
            defaultHeaders: {
                'Authorization': 'Bearer ${ANTHROPIC_API_KEY}'
            },
            rateLimit: {
                requestsPerMinute: 50
            }
        }
    ],
    defaultProviderId: 'openai'
}

describe('ProviderConfigurationService', () => {
    let service: ProviderConfigurationService

    beforeEach(() => {
        service = new ProviderConfigurationService({
            configPath: './test/fixtures'
        })
    })

    afterEach(() => {
        service.clearCache()
        vi.clearAllMocks()
    })

    describe('loadConfigurations', () => {
        it('should load valid provider configurations', async () => {
            vi.spyOn(service['loader'], 'loadConfig').mockResolvedValue(mockProvidersConfig)

            await service.loadConfigurations()
            expect(service['providersConfig']).toBeDefined()
        })

        it('should throw ConfigurationError for invalid configurations', async () => {
            vi.spyOn(service['loader'], 'loadConfig').mockRejectedValue(new Error('Invalid config'))

            await expect(service.loadConfigurations()).rejects.toThrow(ConfigurationError)
        })
    })

    describe('getProviderConfig', () => {
        beforeEach(async () => {
            vi.spyOn(service['loader'], 'loadConfig').mockResolvedValue(mockProvidersConfig)
            await service.loadConfigurations()
        })

        it('should return provider config for valid provider ID', () => {
            const provider = service.getProviderConfig('openai')
            expect(provider).toBeDefined()
            expect(provider.name).toBe('OpenAI')
            expect(provider.type).toBe('openai')
        })

        it('should throw ConfigurationError for non-existent provider', () => {
            expect(() => service.getProviderConfig('non-existent')).toThrow(ConfigurationError)
        })

        it('should throw ConfigurationError when configurations not loaded', () => {
            service.clearCache()
            expect(() => service.getProviderConfig('openai')).toThrow(ConfigurationError)
        })
    })

    describe('getDefaultProviderConfig', () => {
        beforeEach(async () => {
            vi.spyOn(service['loader'], 'loadConfig').mockResolvedValue(mockProvidersConfig)
            await service.loadConfigurations()
        })

        it('should return default provider configuration', () => {
            const provider = service.getDefaultProviderConfig()
            expect(provider).toBeDefined()
            expect(provider.id).toBe('openai')
            expect(provider.name).toBe('OpenAI')
        })

        it('should throw ConfigurationError when configurations not loaded', () => {
            service.clearCache()
            expect(() => service.getDefaultProviderConfig()).toThrow(ConfigurationError)
        })
    })

    describe('getAllProviderConfigs', () => {
        beforeEach(async () => {
            vi.spyOn(service['loader'], 'loadConfig').mockResolvedValue(mockProvidersConfig)
            await service.loadConfigurations()
        })

        it('should return all available providers', () => {
            const providers = service.getAllProviderConfigs()
            expect(providers).toHaveLength(2)
            expect(providers[0].id).toBe('openai')
            expect(providers[1].id).toBe('anthropic')
        })

        it('should throw ConfigurationError when configurations not loaded', () => {
            service.clearCache()
            expect(() => service.getAllProviderConfigs()).toThrow(ConfigurationError)
        })
    })
}) 