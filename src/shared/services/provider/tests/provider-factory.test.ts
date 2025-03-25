import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { ProviderFactory } from '../providerFactory.js'
import { AnthropicProvider } from '../implementations/anthropicProvider.js'
import { GoogleProvider } from '../implementations/googleProvider.js'
import type { ModelConfig } from '@services/model/schemas/modelConfig.js'
import type { TaskModelMapping } from '@services/task/schemas/taskConfig.js'
import type { ProviderConfig } from '@services/provider/schemas/providerConfig.js'

interface ModelIdentifier {
    readonly modelId: string;
}

interface TaskIdentifier {
    readonly taskName: string;
}

interface MockModelRegistry {
    getModelById: Mock<[modelId: string], ModelConfig | null>;
    getDefaultModel: Mock<[], ModelConfig | null>;
    getDefaultTemperature: Mock<[], number>;
}

interface MockTaskRegistry {
    getTaskConfig: Mock<[taskName: string], TaskModelMapping | null>
}

interface MockProviderRegistry {
    getProviderConfig: Mock<[provider: string], ProviderConfig | null>
}

describe('ProviderFactory', () => {
    let providerFactory: ProviderFactory
    let mockModelRegistry: MockModelRegistry
    let mockTaskRegistry: MockTaskRegistry
    let mockProviderRegistry: MockProviderRegistry

    beforeEach(() => {
        mockModelRegistry = {
            getModelById: vi.fn<[string], ModelConfig | null>(),
            getDefaultModel: vi.fn<[], ModelConfig | null>(),
            getDefaultTemperature: vi.fn<[], number>().mockReturnValue(0.2)
        }

        mockTaskRegistry = {
            getTaskConfig: vi.fn<[string], TaskModelMapping | null>()
        }

        mockProviderRegistry = {
            getProviderConfig: vi.fn<[string], ProviderConfig | null>()
        }
        
        providerFactory = new ProviderFactory()
        
        // Replace the internal instances with our mocks
        Object.assign(providerFactory, {
            modelRegistry: mockModelRegistry,
            taskRegistry: mockTaskRegistry,
            providerRegistry: mockProviderRegistry
        })
    })

    describe('createProviderForModelId', () => {
        it('should create Anthropic provider for Claude model', () => {
            const modelIdentifier = { modelId: 'claude-2' } as const;
            
            mockModelRegistry.getModelById.mockReturnValue({
                id: modelIdentifier.modelId,
                provider: 'anthropic',
                modelName: 'claude-2',
                maxTokens: 100000,
                contextWindowSize: 'large-context-window',
                capabilities: ['text-generation'],
                thinkingLevel: 'high'
            })
            
            mockProviderRegistry.getProviderConfig.mockReturnValue({
                id: 'anthropic',
                type: 'anthropic',
                name: 'Anthropic Provider'
            })

            const provider = providerFactory.createProviderForModelId(modelIdentifier)
            
            expect(provider).toBeInstanceOf(AnthropicProvider)
        })

        it('should throw error for non-existent model', () => {
            mockModelRegistry.getModelById.mockReturnValue({
                id: 'non-existent-model',
                provider: 'openai',
                modelName: 'non-existent',
                maxTokens: 2048,
                contextWindowSize: 'small-context-window',
                capabilities: ['text-generation'],
                thinkingLevel: 'low'
            })

            const invalidModel = { modelId: 'non-existent-model' } as const;
            expect(() => {
                providerFactory.createProviderForModelId(invalidModel)
            }).toThrow('Provider not found for model')
        })
    })

    describe('createDefaultProvider', () => {
        it('should create default provider with correct temperature', () => {
            mockModelRegistry.getDefaultModel.mockReturnValue({
                id: 'default-model',
                provider: 'google',
                modelName: 'gemini-pro',
                maxTokens: 2048,
                contextWindowSize: 'medium-context-window',
                capabilities: ['text-generation'],
                thinkingLevel: 'medium'
            })
            
            mockProviderRegistry.getProviderConfig.mockReturnValue({
                id: 'google',
                type: 'google',
                name: 'Google Provider'
            })

            const result = providerFactory.createDefaultProvider()
            
            expect(result.provider).toBeInstanceOf(GoogleProvider)
            expect(result.temperature).toBeDefined()
        })

        it('should throw error when default model not found', () => {
            mockModelRegistry.getDefaultModel.mockReturnValue({
                id: 'non-existent-model',
                provider: 'openai',
                modelName: 'non-existent',
                maxTokens: 2048,
                contextWindowSize: 'small-context-window',
                capabilities: ['text-generation'],
                thinkingLevel: 'low'
            })

            expect(() => {
                providerFactory.createDefaultProvider()
            }).toThrow('Provider not found for default model: openai')
        })
    })
})
