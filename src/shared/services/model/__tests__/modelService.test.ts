import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { JSONValue, ModelCompletionOptions } from '../../../../types.js'
import type { IProviderService } from '../../provider/types.js'
import { GenerationError } from '../errors.js'
import { ModelConfigurationService } from '../modelConfigurationService.js'
import { ModelService } from '../modelService.js'
import type { ModelConfigFile, ModelServiceConfig } from '../types.js'

// Mock configuration file
const mockModelConfig: ModelConfigFile = {
    name: 'test-models',
    version: '1.0.0',
    defaultModelId: 'test-model',
    models: [
        {
            id: 'test-model',
            provider: 'openai',
            modelName: 'GPT-3.5',
            capabilities: ['text-generation', 'embeddings', 'image-generation'],
            contextWindowSize: 'medium-context-window',
            thinkingLevel: 'medium',
            maxTokens: 4096
        }
    ]
}

// Mock provider response
const mockProviderResponse = {
    content: 'test response',
    tokens: {
        prompt: 10,
        completion: 20,
        total: 30
    },
    model: 'test-model',
    finishReason: 'stop'
}

// Mock provider
const mockProvider = {
    complete: vi.fn().mockResolvedValue(mockProviderResponse),
    getModelConfig: vi.fn().mockReturnValue(mockModelConfig.models[0])
}

// Mock provider service
const mockProviderService: IProviderService = {
    getProvider: vi.fn().mockResolvedValue(mockProvider),
    getProviderForModel: vi.fn().mockResolvedValue(mockProvider),
    validateProvider: vi.fn().mockResolvedValue(true)
}

describe('ModelService', () => {
    let modelService: ModelService

    beforeEach(() => {
        // Mock the ModelConfigurationService
        vi.spyOn(ModelConfigurationService.prototype, 'loadConfig')
            .mockReturnValue(mockModelConfig)

        vi.spyOn(ModelConfigurationService.prototype, 'getModel')
            .mockReturnValue(mockModelConfig.models[0])

        // Create the model service with configuration
        const config: ModelServiceConfig = {
            configPath: 'models.json',
            environment: 'test'
        }

        modelService = new ModelService(config, mockProviderService)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('constructor', () => {
        it('should initialize with the provided configuration', () => {
            expect(modelService).toBeDefined()
            expect(ModelConfigurationService.prototype.loadConfig).toHaveBeenCalled()
        })

        it('should use default environment when not provided', () => {
            const config: ModelServiceConfig = {
                configPath: 'models.json'
            }

            const service = new ModelService(config, mockProviderService)
            expect(service).toBeDefined()
        })
    })

    describe('generateText', () => {
        it('should generate text using the provider', async () => {
            const options: ModelCompletionOptions<JSONValue> = {
                modelId: 'gpt-4o',
                prompt: 'test prompt',
                maxTokens: 100
            }

            const result = await modelService.generateText(options)

            expect(result).toEqual({
                text: mockProviderResponse.content,
                usage: {
                    promptTokens: mockProviderResponse.tokens.prompt,
                    completionTokens: mockProviderResponse.tokens.completion,
                    totalTokens: mockProviderResponse.tokens.total
                },
                model: mockProviderResponse.model,
                finishReason: mockProviderResponse.finishReason
            })

            expect(mockProviderService.getProviderForModel).toHaveBeenCalledWith('test-model')
            expect(mockProvider.complete).toHaveBeenCalledWith('test prompt', {
                maxTokens: 100,
                format: undefined,
                systemPrompt: undefined,
                temperature: undefined
            })
        })

        it('should handle provider errors', async () => {
            mockProvider.complete.mockRejectedValueOnce(new Error('Provider error'))

            const options: ModelCompletionOptions<JSONValue> = {
                modelId: 'gpt-4o',
                prompt: 'test prompt'
            }

            await expect(modelService.generateText(options))
                .rejects.toThrow(GenerationError)
        })
    })

    describe('generateObject', () => {
        beforeEach(() => {
            mockProvider.complete.mockResolvedValueOnce({
                ...mockProviderResponse,
                content: JSON.stringify({ key: 'value' })
            })
        })

        it('should generate and parse JSON objects', async () => {
            const result = await modelService.generateObject({
                modelId: 'gpt-4o',
                prompt: 'Generate a test object'
            })

            expect(result).toEqual({ key: 'value' })
            expect(mockProvider.complete).toHaveBeenCalledWith('Generate a test object', {
                format: 'json'
            })
        })

        it('should validate generated objects', async () => {
            const validator = (data: unknown): data is JSON => {
                return typeof data === 'object' && data !== null && 'key' in data
            }

            const result = await modelService.generateObject({
                modelId: 'gpt-4o',
                prompt: 'Generate a test object',
                validator
            })

            expect(result).toEqual({ key: 'value' })
        })

        it('should handle validation failures', async () => {
            const validator = (data: unknown): data is JSON => {
                return typeof data === 'object' && data !== null && 'missing' in data
            }

            await expect(modelService.generateObject({
                modelId: 'gpt-4o',
                prompt: 'Generate a test object',
                validator
            })).rejects.toThrow('Generated data failed validation')
        })
    })

    describe('generateEmbedding', () => {
        beforeEach(() => {
            mockProvider.complete.mockResolvedValueOnce({
                ...mockProviderResponse,
                content: JSON.stringify([0.1, 0.2, 0.3])
            })
        })

        it('should generate embeddings using the provider', async () => {
            const options: ModelCompletionOptions = {
                modelId: 'gpt-4o',
                prompt: 'test input'
            }

            const result = await modelService.generateEmbedding(options)

            expect(result).toEqual({
                embedding: [0.1, 0.2, 0.3],
                usage: {
                    promptTokens: mockProviderResponse.tokens.prompt,
                    completionTokens: mockProviderResponse.tokens.completion,
                    totalTokens: mockProviderResponse.tokens.total
                },
                model: mockProviderResponse.model
            })

            expect(mockProvider.complete).toHaveBeenCalledWith('test input', {
                format: 'embedding'
            })
        })

        it('should handle provider errors', async () => {
            mockProvider.complete.mockRejectedValueOnce(new Error('Provider error'))

            const options: ModelCompletionOptions = {
                modelId: 'gpt-4o',
                prompt: 'test input'
            }

            await expect(modelService.generateEmbedding(options))
                .rejects.toThrow(GenerationError)
        })
    })

    describe('generateImage', () => {
        beforeEach(() => {
            mockProvider.complete.mockResolvedValueOnce({
                ...mockProviderResponse,
                content: 'https://example.com/image.png'
            })
        })

        it('should generate images using the provider', async () => {
            const options: ModelCompletionOptions = {
                modelId: 'gpt-4o',
                prompt: 'test prompt',
                size: 'large',
                quality: 'standard',
                style: 'casual'
            }

            const result = await modelService.generateImage(options)

            expect(result).toEqual({
                imageUrl: 'https://example.com/image.png',
                usage: {
                    promptTokens: mockProviderResponse.tokens.prompt,
                    completionTokens: mockProviderResponse.tokens.completion,
                    totalTokens: mockProviderResponse.tokens.total
                },
                model: mockProviderResponse.model
            })

            expect(mockProvider.complete).toHaveBeenCalledWith('test prompt', {
                format: 'image',
                size: 'large',
                quality: 'standard',
                style: 'casual'
            })
        })

        it('should handle provider errors', async () => {
            mockProvider.complete.mockRejectedValueOnce(new Error('Provider error'))

            const options: ModelCompletionOptions = {
                modelId: 'gpt-4o',
                prompt: 'test prompt'
            }

            await expect(modelService.generateImage(options))
                .rejects.toThrow(GenerationError)
        })
    })
}) 