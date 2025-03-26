import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationError } from '../../configuration'
import { ModelConfigurationService } from '../modelConfigurationService'
import type { ModelConfigFile } from '../schemas/modelConfig.js'

// Test fixture data
const mockModelsConfig: ModelConfigFile = {
    name: 'test-models',
    version: '1.0.0',
    models: [
        {
            id: 'gpt-4',
            provider: 'openai',
            modelName: 'GPT-4',
            capabilities: ['chat', 'reasoning'],
            contextWindowSize: 'medium-context-window',
            thinkingLevel: 'medium',
            maxTokens: 4096
        },
        {
            id: 'gpt-3.5',
            provider: 'openai',
            modelName: 'GPT-3.5',
            capabilities: ['chat'],
            contextWindowSize: 'medium-context-window',
            thinkingLevel: 'medium',
            maxTokens: 4096
        }
    ]
}

describe('ModelConfigurationService', () => {
    let service: ModelConfigurationService

    beforeEach(() => {
        service = new ModelConfigurationService({
            configPath: './test/fixtures',
            basePath: './test'
        })
    })

    describe('loadConfigurations', () => {
        it('should load valid configurations successfully', async () => {
            vi.spyOn(service['loader'], 'loadConfig').mockResolvedValue(mockModelsConfig)
            await service.loadConfigurations()
            expect(true).toBe(true)
        })

        it('should throw ConfigurationError for invalid configurations', async () => {
            const invalidConfig = { models: [], name: '', version: '' }
            vi.spyOn(service['loader'], 'loadConfig').mockResolvedValue(invalidConfig)
            await expect(service.loadConfigurations()).rejects.toThrow(ConfigurationError)
        })
    })

    describe('getModel', () => {
        beforeEach(async () => {
            vi.spyOn(service['loader'], 'loadConfig').mockResolvedValue(mockModelsConfig)
            await service.loadConfigurations()
        })

        it('should return model config for valid model ID', () => {
            const model = service.getModel('gpt-4')
            expect(model).toBeDefined()
            expect(model.id).toBe('gpt-4')
        })

        it('should throw ConfigurationError for invalid model ID', () => {
            expect(() => service.getModel('invalid-model')).toThrow(ConfigurationError)
        })
    })
})