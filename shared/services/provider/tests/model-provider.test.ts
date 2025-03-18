import { describe, it, expect, beforeEach } from 'vitest'
import { OpenAIProvider } from '../implementations/openaiProvider.js'
import type { ModelCompletionOptions, ModelCompletionResponse } from '../modelProvider.js'

describe('BaseModelProvider and Implementations', () => {
    describe('OpenAIProvider', () => {
        let provider: OpenAIProvider
        const mockModelConfig = {
            id: 'gpt-4',
            provider: 'openai' as const,
            modelName: 'GPT-4',
            maxTokens: 4000,
            contextWindowSize: 'large-context-window' as const,
            capabilities: ['text-generation'] as Array<'text-generation'>,
            thinkingLevel: 'high' as const
        }
        const mockApiKey = 'test-api-key'

        beforeEach(() => {
            provider = new OpenAIProvider(mockModelConfig, mockApiKey)
        })

        describe('getModelConfig', () => {
            it('should return the model configuration', () => {
                const config = provider.getModelConfig()
                expect(config).toEqual(mockModelConfig)
            })
        })

        describe('complete', () => {
            it('should complete prompt with default options', async () => {
                const options: ModelCompletionOptions = {
                    prompt: 'Test prompt'
                }

                const response = await provider.complete(options)

                expect(response).toHaveProperty('text')
                expect(response).toHaveProperty('usage')
                expect(response).toHaveProperty('modelId', mockModelConfig.id)
                expect(response.usage).toHaveProperty('promptTokens')
                expect(response.usage).toHaveProperty('completionTokens')
                expect(response.usage).toHaveProperty('totalTokens')
            })

            it('should apply custom temperature and maxTokens', async () => {
                const options: ModelCompletionOptions = {
                    prompt: 'Test prompt',
                    temperature: 0.8,
                    maxTokens: 2000
                }

                const response = await provider.complete(options)

                expect(response).toHaveProperty('text')
                expect(response).toHaveProperty('modelId', mockModelConfig.id)
            })

            it('should handle system prompts', async () => {
                const options: ModelCompletionOptions = {
                    prompt: 'Test prompt',
                    systemPrompt: 'You are a helpful assistant'
                }

                const response = await provider.complete(options)

                expect(response).toHaveProperty('text')
                expect(response).toHaveProperty('modelId', mockModelConfig.id)
            })

            it('should handle function calls', async () => {
                const options: ModelCompletionOptions = {
                    prompt: 'Test prompt',
                    functions: [{
                        name: 'testFunction',
                        description: 'A test function',
                        parameters: {
                            type: 'object',
                            properties: {
                                test: { type: 'string' }
                            }
                        }
                    }],
                    functionCall: 'testFunction'
                }

                const response = await provider.complete(options)

                expect(response).toHaveProperty('text')
                expect(response).toHaveProperty('modelId', mockModelConfig.id)
            })

            it('should handle errors gracefully', async () => {
                const options: ModelCompletionOptions = {
                    prompt: '',
                    maxTokens: -1 // Invalid tokens to trigger error
                }

                await expect(provider.complete(options))
                    .rejects
                    .toThrow('Invalid maxTokens value')
            })
        })

        describe('generateImage', () => {
            it('should generate image with default options', async () => {
                const response = await provider.generateImage({
                    prompt: 'A test image'
                })

                expect(response.images).toBeInstanceOf(Array)
                expect(response.images.length).toBeGreaterThan(0)
                expect(response.usage).toHaveProperty('promptTokens')
                expect(response.usage).toHaveProperty('totalTokens')
            })

            it('should handle custom image generation options', async () => {
                const response = await provider.generateImage({
                    prompt: 'A test image',
                    size: '1024x1024',
                    numberOfImages: 2
                })

                expect(response.images).toBeInstanceOf(Array)
                expect(response.usage).toBeDefined()
            })

            it('should handle errors in image generation', async () => {
                await expect(provider.generateImage({
                    prompt: '',
                    size: 'invalid-size' // Invalid size to trigger error
                }))
                    .rejects
                    .toThrow('Invalid image size')
            })
        })
    })
})
