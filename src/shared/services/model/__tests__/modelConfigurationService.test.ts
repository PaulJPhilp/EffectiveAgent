import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationError } from '../../configuration'
import { ModelConfigurationService } from '../modelConfigurationService'
import type { ModelsConfig } from '../schemas/modelConfig'

// Test fixture data
const mockModelsConfig: ModelsConfig = {
    groups: {
        chat: {
            name: 'Chat Models',
            description: "Testing Models Config",
            models: {
                'gpt-4': {
                    id: 'gpt-4',
                    provider: 'openai',
                    modelName: 'GPT-4',
                    capabilities: ['chat', 'reasoning'],
                    contextWindowSize: 'large-context-window',
                    metadata: {
                        thinkingLevel: 'high'
                    }
                },
                'gpt-3.5': {
                    id: 'gpt-3.5',
                    provider: 'openai',
                    modelName: 'GPT-3.5',
                    capabilities: ['chat'],
                    contextWindowSize: 'medium-context-window',
                    metadata: {
                        thinkingLevel: 'low'
                    }
                }
            }
        }
    },
    updated: '',
    name: '',
    version: ''
}

describe('ModelConfigurationService', () => {
    let service: ModelConfigurationService

    beforeEach(() => {
        service = new ModelConfigurationService({
            configPath: './test/fixtures'
        })
    })

    afterEach(() => {
        service.clearCache()
    })

    describe('loadConfigurations', () => {
        it('should load valid configurations successfully', async () => {
            // Mock the loader to return our test config
            vi.spyOn(service['loader'], 'loadConfig').mockResolvedValue(mockModelsConfig)

            await service.loadConfigurations()
            expect(true).toBe(true) // If we get here without throwing, the test passes
        })

        it('should throw ConfigurationError for invalid configurations', async () => {
            const invalidConfig = { groups: {}, name: '', version: '' }
            vi.spyOn(service['loader'], 'loadConfig').mockResolvedValue(invalidConfig)

            await expect(service.loadConfigurations()).rejects.toThrow(ConfigurationError)
        })
    })

    describe('getModelConfig', () => {
        beforeEach(async () => {
            vi.spyOn(service['loader'], 'loadConfig').mockResolvedValue(mockModelsConfig)
            await service.loadConfigurations()
        })

        it('should return model config for valid model ID', () => {
            const model = service.getModelConfig('gpt-4')
            expect(model).toBeDefined()
            expect(model.id).toBe('gpt-4')
        })

        it('should throw ConfigurationError for invalid model ID', () => {
            expect(() => service.getModelConfig('invalid-model')).toThrow(ConfigurationError)
        })
    })

    describe('getModelsByCapability', () => {
        beforeEach(async () => {
            vi.spyOn(service['loader'], 'loadConfig').mockResolvedValue(mockModelsConfig)
            await service.loadConfigurations()
        })

        it('should return models with specified capability', () => {
            const reasoningModels = service.getModelsByCapability('reasoning')
            expect(reasoningModels).toHaveLength(1)
            expect(reasoningModels[0].id).toBe('gpt-4')

            const chatModels = service.getModelsByCapability('chat')
            expect(chatModels).toHaveLength(2)
        })
        it('should return empty array for non-existent capability', () => {
            const models = service.getModelsByCapability('code' as any)
            expect(models).toHaveLength(0)
        })
    })

    describe('getModelsByThinkingLevel', () => {
        beforeEach(async () => {
            vi.spyOn(service['loader'], 'loadConfig').mockResolvedValue(mockModelsConfig)
            await service.loadConfigurations()
        })

        it('should return models with specified thinking level', () => {
            const advancedModels = service.getModelsByThinkingLevel('high')
            expect(advancedModels).toHaveLength(1)
            expect(advancedModels[0].id).toBe('gpt-4')
        })
        it('should return empty array for non-existent thinking level', () => {
            const models = service.getModelsByThinkingLevel('none' as any)
            expect(models).toHaveLength(0)
        })
    })

    describe('getModelsByContextWindow', () => {
        beforeEach(async () => {
            vi.spyOn(service['loader'], 'loadConfig').mockResolvedValue(mockModelsConfig)
            await service.loadConfigurations()
        })

        it('should return models with specified context window size', () => {
            const models32k = service.getModelsByContextWindow('large-context-window')
            expect(models32k).toHaveLength(1)
            expect(models32k[0].id).toBe('gpt-4')
        })

        it('should return empty array for non-existent context window size', () => {
            const models = service.getModelsByContextWindow('small-context-window')
            expect(models).toHaveLength(0)
        })
    })
}) 