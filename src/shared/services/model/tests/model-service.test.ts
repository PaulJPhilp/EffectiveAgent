import { 
    describe, 
    it, 
    expect, 
    beforeEach, 
    vi, 
    type Mock 
} from 'vitest';
import { ModelService } from '../modelService.js';
import { ProviderFactory } from '../../provider/providerFactory.js';
import { ModelRegistryService } from '../modelRegistryService.js';
import { BaseModelProvider } from '../../provider/modelProvider.js';
import type { 
    ModelCompletionOptions,
    ModelCompletionResponse,
    ImageGenerationOptions,
    ImageGenerationResponse,
    EmbeddingOptions,
    EmbeddingResponse
} from '../../provider/modelProvider.js';
import type { ModelConfig } from '../schemas/modelConfig.js';

// Mock implementations
abstract class MockBaseProvider extends BaseModelProvider {
    readonly complete = vi.fn<
        [ModelCompletionOptions], 
        Promise<ModelCompletionResponse>
    >();
    
    getModelConfig(): Record<string, unknown> {
        return this.modelConfig;
    }

    protected applyDefaultOptions(
        options: ModelCompletionOptions
    ): ModelCompletionOptions {
        return options;
    }

    protected addModelIdToResponse(
        response: ModelCompletionResponse
    ): ModelCompletionResponse {
        return {
            ...response,
            modelId: this.modelConfig.id
        };
    }
}

// Add image generation capability to mock provider
class MockImageProvider extends MockBaseProvider {
    readonly generateImage = vi.fn<
        [ImageGenerationOptions], 
        Promise<ImageGenerationResponse>
    >();
}

// Add embedding capability to mock provider
class MockEmbeddingProvider extends MockBaseProvider {
    readonly generateEmbedding = vi.fn<
        [EmbeddingOptions], 
        Promise<EmbeddingResponse>
    >();
}

// Basic provider for text generation only
class MockTextProvider extends MockBaseProvider {}

interface MockProviderFactory {
    createProviderForModelId: Mock<[string], BaseModelProvider>;
}

interface MockModelRegistry {
    getAllModels: Mock<[], Promise<ModelConfig[]>>;
}

describe('ModelService', () => {
    let modelService: ModelService;
    let mockProviderFactory: MockProviderFactory;
    let mockModelRegistry: MockModelRegistry;
    let mockProvider: MockTextProvider;
    let mockImageProvider: MockImageProvider;
    let mockEmbeddingProvider: MockEmbeddingProvider;

    beforeEach(() => {
        // Create mock providers with different capabilities
        const baseModelConfig: ModelConfig = {
            id: 'test-model',
            provider: 'openai',
            modelName: 'test-model',
            capabilities: ['text-generation'],
            contextWindowSize: 'medium-context-window',
            thinkingLevel: 'medium'
        };
        
        const imageModelConfig: ModelConfig = {
            ...baseModelConfig,
            id: 'image-model',
            modelName: 'image-model',
            capabilities: ['text-to-image']
        };

        const embeddingModelConfig: ModelConfig = {
            ...baseModelConfig,
            id: 'embedding-model',
            modelName: 'embedding-model',
            capabilities: ['embeddings']
        };
        
        mockProvider = new MockTextProvider(baseModelConfig);
        mockImageProvider = new MockImageProvider(imageModelConfig);
        mockEmbeddingProvider = new MockEmbeddingProvider(embeddingModelConfig);

        // Create mock provider factory
        mockProviderFactory = {
            createProviderForModelId: vi.fn<[string], BaseModelProvider>()
        };

        // Create mock model registry
        mockModelRegistry = {
            getAllModels: vi.fn<[], Promise<ModelConfig[]>>()
        };

        // Create model service with mocked dependencies
        modelService = new ModelService({ configPath: '' });
        
        // Replace internal dependencies with mocks
        (modelService as any).providerFactory = mockProviderFactory;
        (modelService as any).modelRegistry = mockModelRegistry;
    });

    describe('completeWithModel', () => {
        const modelIdentifier = { modelId: 'test-model' } as const;
        const options: ModelCompletionOptions = {
            prompt: 'test prompt',
            maxTokens: 100
        } as const;

        it('should complete prompt with specified model', async () => {
            const expectedResponse: ModelCompletionResponse = {
                text: 'Test response',
                modelId: 'test-model',
                usage: {
                    promptTokens: 10,
                    completionTokens: 5,
                    totalTokens: 15
                }
            };

            mockProviderFactory.createProviderForModelId
                .mockReturnValue(mockProvider);
            mockProvider.complete.mockResolvedValue(expectedResponse);

            const response = await modelService.completeWithModel(
                modelIdentifier,
                options
            );

            expect(mockProviderFactory.createProviderForModelId)
                .toHaveBeenCalledWith(modelIdentifier.modelId);
            expect(mockProvider.complete).toHaveBeenCalledWith(options);
            expect(response).toEqual(expectedResponse);
        });

        it('should handle provider creation failure', async () => {
            mockProviderFactory.createProviderForModelId
                .mockImplementation(() => {
                    throw new Error('Provider creation failed');
                });

            await expect(modelService.completeWithModel(modelIdentifier, options))
                .rejects.toThrow('Provider creation failed');
        });

        it('should handle completion failure', async () => {
            mockProviderFactory.createProviderForModelId
                .mockReturnValue(mockProvider);
            mockProvider.complete.mockRejectedValue(
                new Error('Completion failed')
            );

            await expect(modelService.completeWithModel(modelIdentifier, options))
                .rejects.toThrow('Completion failed');
        });
    });

    describe('completeWithDefaultModel', () => {
        const options: ModelCompletionOptions = {
            prompt: 'test prompt',
            maxTokens: 100
        };

        it('should complete prompt with default model', async () => {
            const defaultModel: ModelConfig = {
                id: 'default-model',
                provider: 'openai',
                modelName: 'default-model',
                capabilities: ['text-generation'],
                contextWindowSize: 'medium-context-window',
                thinkingLevel: 'medium'
            };

            const expectedResponse: ModelCompletionResponse = {
                text: 'Test response',
                modelId: defaultModel.id,
                usage: {
                    promptTokens: 10,
                    completionTokens: 5,
                    totalTokens: 15
                }
            };

            mockModelRegistry.getAllModels.mockResolvedValue([defaultModel]);
            mockProviderFactory.createProviderForModelId
                .mockReturnValue(mockProvider);
            mockProvider.complete.mockResolvedValue(expectedResponse);

            const response = await modelService.completeWithDefaultModel(options);

            expect(mockModelRegistry.getAllModels).toHaveBeenCalled();
            expect(mockProviderFactory.createProviderForModelId)
                .toHaveBeenCalledWith(defaultModel.id);
            expect(mockProvider.complete).toHaveBeenCalledWith(options);
            expect(response).toEqual(expectedResponse);
        });

        it('should throw error when no models available', async () => {
            mockModelRegistry.getAllModels.mockResolvedValue([]);

            await expect(modelService.completeWithDefaultModel(options))
                .rejects.toThrow('No models available in registry');
        });
    });

    describe('generateImage', () => {
        const options: ImageGenerationOptions = {
            prompt: 'test prompt',
            size: '256x256'
        };

        it('should generate image with capable model', async () => {
            const defaultModel: ModelConfig = {
                id: 'image-model',
                provider: 'openai',
                modelName: 'image-model',
                capabilities: ['text-to-image'],
                contextWindowSize: 'medium-context-window',
                thinkingLevel: 'medium'
            };

            const expectedResponse: ImageGenerationResponse = {
                images: ['test-url'],
                modelId: defaultModel.id,
                usage: {
                    promptTokens: 10,
                    totalTokens: 15
                }
            };

            mockModelRegistry.getAllModels.mockResolvedValue([defaultModel]);
            mockProviderFactory.createProviderForModelId
                .mockReturnValue(mockImageProvider);
            mockImageProvider.generateImage.mockResolvedValue(expectedResponse);

            const response = await modelService.generateImage(options);

            expect(mockModelRegistry.getAllModels).toHaveBeenCalled();
            expect(mockProviderFactory.createProviderForModelId)
                .toHaveBeenCalledWith(defaultModel.id);
            expect(mockImageProvider.generateImage)
                .toHaveBeenCalledWith(options);
            expect(response).toEqual(expectedResponse);
        });

        it('should throw error for model without image capability', async () => {
            const defaultModel: ModelConfig = {
                id: 'text-only-model',
                provider: 'openai',
                modelName: 'text-only-model',
                capabilities: ['text-generation'],
                contextWindowSize: 'medium-context-window',
                thinkingLevel: 'medium'
            };

            mockModelRegistry.getAllModels.mockResolvedValue([defaultModel]);
            mockProviderFactory.createProviderForModelId
                .mockReturnValue(mockProvider);

            await expect(modelService.generateImage(options))
                .rejects.toThrow(
                    'Provider for model text-only-model does not support ' + 
                    'image generation'
                );
        });
    });

    describe('generateEmbedding', () => {
        const options: EmbeddingOptions = {
            input: 'test text'
        };

        it('should generate embedding with capable model', async () => {
            const defaultModel: ModelConfig = {
                id: 'embedding-model',
                provider: 'openai',
                modelName: 'embedding-model',
                capabilities: ['embeddings'],
                contextWindowSize: 'medium-context-window',
                thinkingLevel: 'medium'
            };

            const expectedResponse: EmbeddingResponse = {
                embeddings: [[0.1, 0.2, 0.3]],
                modelId: defaultModel.id,
                usage: {
                    promptTokens: 10,
                    totalTokens: 15
                }
            };

            mockModelRegistry.getAllModels.mockResolvedValue([defaultModel]);
            mockProviderFactory.createProviderForModelId
                .mockReturnValue(mockEmbeddingProvider);
            mockEmbeddingProvider.generateEmbedding
                .mockResolvedValue(expectedResponse);

            const response = await modelService.generateEmbedding(options);

            expect(mockModelRegistry.getAllModels).toHaveBeenCalled();
            expect(mockProviderFactory.createProviderForModelId)
                .toHaveBeenCalledWith(defaultModel.id);
            expect(mockEmbeddingProvider.generateEmbedding)
                .toHaveBeenCalledWith(options);
            expect(response).toEqual(expectedResponse);
        });

        it('should throw error for model without embedding capability', 
            async () => {
                const defaultModel: ModelConfig = {
                    id: 'text-only-model',
                    provider: 'openai',
                    modelName: 'text-only-model',
                    capabilities: ['text-generation'],
                    contextWindowSize: 'medium-context-window',
                    thinkingLevel: 'medium'
                };

                mockModelRegistry.getAllModels
                    .mockResolvedValue([defaultModel]);
                mockProviderFactory.createProviderForModelId
                    .mockReturnValue(mockProvider);

                await expect(modelService.generateEmbedding(options))
                    .rejects.toThrow(
                        'Provider for model text-only-model does not support ' + 
                        'embeddings'
                    );
            }
        );
    });
});
