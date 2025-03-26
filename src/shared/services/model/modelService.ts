import type { JSONValue } from '@/types.ts'
import type {
    ModelCompletionOptions,
    ModelCompletionResponse
} from '@/types.ts'
import type { IProviderService } from '../provider/types.js'
import { GenerationError, ValidationError } from './errors.js'
import { ModelConfigurationService } from './modelConfigurationService.js'
import type {
    IModelService,
    ModelConfigFile,
    ModelServiceConfig
} from './types.js'

/**
 * Service for managing model interactions and generation tasks
 * Handles text generation, object generation, embeddings, and image generation
 * through various model providers
 */
export class ModelService implements IModelService {
    private readonly debug: boolean
    private readonly config: ModelConfigFile
    private readonly configService: ModelConfigurationService
    private readonly providerService: IProviderService

    /**
     * Creates a new ModelService instance
     * @param config - Configuration for the model service
     * @param providerService - Service for managing model providers
     */
    constructor(
        config: ModelServiceConfig,
        providerService: IProviderService
    ) {
        this.debug = config.debug ?? false
        this.providerService = providerService

        this.configService = new ModelConfigurationService({
            configPath: config.configPath,
            environment: config.environment ?? 'development',
            basePath: process.cwd()
        })

        this.config = this.configService.loadConfig(config.configPath)

        if (this.debug) {
            console.log('[ModelService] Initialized with config:', this.config)
        }
    }

    /**
     * Generates text using the specified model and options
     * @param options - Options for text generation including prompt, model settings, and format
     * @returns A promise resolving to the generated text response with usage statistics
     * @throws {GenerationError} If text generation fails
     * @example
     * ```typescript
     * const response = await modelService.generateText({
     *   prompt: "Explain quantum computing",
     *   modelId: "gpt-4",
     *   maxTokens: 500
     * });
     * ```
     */
    async generateText(
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse> {
        if (this.debug) {
            console.log('[ModelService] Generating text with options:', options)
        }

        try {
            // Get the model configuration
            const modelConfig = this.configService.getModel(options.modelId)

            // Get the provider for this model
            const provider = await this.providerService.getProviderForModel(modelConfig.id)

            // Generate the completion using the provider
            const result = await provider.complete(options.prompt, {
                prompt: options.prompt,
                temperature: options.temperature,
                maxTokens: options.maxTokens,
                format: options.format
            })

            return {
                text: result.content,
                usage: {
                    promptTokens: result.tokens.prompt,
                    completionTokens: result.tokens.completion,
                    totalTokens: result.tokens.total
                },
                modelId: result.model,
                finishReason: result.finishReason ?? 'unknown'
            }
        } catch (error) {
            throw new GenerationError(
                'Failed to generate text',
                options.modelId,
                error instanceof Error ? error : undefined
            )
        }
    }

    /**
     * Generates a typed object using the model
     * @template T - The type of object to generate
     * @param options - Options for object generation including prompt and validation
     * @returns A promise resolving to the generated object of type T
     */
    async generateObject<T extends JSONValue = JSONValue>(
        options: ModelCompletionOptions<T>
    ): Promise<ModelCompletionResponse> {
        if (this.debug) {
            console.log('[ModelService] Generating object with options:', options)
        }

        try {
            const response = await this.generateText({
                modelId: options.modelId,
                prompt: options.prompt,
                format: 'json'
            })

            const data = JSON.parse(response.text || '{}') as T

            if (options.validator && !options.validator(data)) {
                throw new ValidationError(
                    'Generated data failed validation',
                    ['Invalid data format'],
                    data
                )
            }
            return {
                json: data as T,
                usage: response.usage,
                modelId: response.modelId,
                finishReason: response.finishReason ?? 'unknown'
            }
        } catch (error) {
            if (error instanceof ValidationError) throw error
            throw new GenerationError(
                'Failed to generate object',
                'unknown',
                error instanceof Error ? error : undefined
            )
        }
    }

    /**
     * Generates embeddings for the given text using the specified model
     * @param options - Options for embedding generation including text and model settings
     * @returns A promise resolving to the embedding response with usage statistics
     * @throws {GenerationError} If embedding generation fails or if the model doesn't support embeddings
     * @example
     * ```typescript
     * const embedding = await modelService.generateEmbedding({
     *   text: "Example text to embed",
     *   modelId: "text-embedding-ada-002"
     * });
     * ```
     */
    async generateEmbedding(
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse> {
        if (this.debug) {
            console.log('[ModelService] Generating embedding with options:', options)
        }

        try {
            // Get the model configuration
            const modelConfig = this.configService.getModel(options.modelId)

            // Get the provider for this model
            const provider = await this.providerService.getProviderForModel(modelConfig.id)

            // Verify the model supports embeddings
            if (!modelConfig.capabilities.includes('embeddings')) {
                throw new Error(`Model ${modelConfig.id} does not support embeddings`)
            }

            // Generate the embedding using the provider
            const result = await provider.complete(options.prompt, {
                format: 'embedding'
            })

            return {
                embedding: JSON.parse(result.content),
                usage: {
                    promptTokens: result.tokens.prompt,
                    completionTokens: result.tokens.completion,
                    totalTokens: result.tokens.total
                },
                modelId: result.model,
                finishReason: result.finishReason ?? 'unknown'
            }
        } catch (error) {
            throw new GenerationError(
                'Failed to generate embedding',
                options.modelId,
                error instanceof Error ? error : undefined
            )
        }
    }

    /**
     * Generates an image using the specified model and options
     * @param options - Options for image generation including prompt and image settings
     * @returns A promise resolving to the image generation response with usage statistics
     * @throws {GenerationError} If image generation fails or if the model doesn't support image generation
     * @example
     * ```typescript
     * const image = await modelService.generateImage({
     *   prompt: "A serene mountain landscape at sunset",
     *   size: "1024x1024",
     *   quality: "high",
     *   style: "natural"
     * });
     * ```
     */
    async generateImage(
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse> {
        if (this.debug) {
            console.log('[ModelService] Generating image with options:', options)
        }

        try {
            // Get the model configuration
            const modelConfig = this.configService.getModel(options.modelId)

            // Get the provider for this model
            const provider = await this.providerService.getProviderForModel(modelConfig.id)

            // Verify the model supports image generation
            if (!modelConfig.capabilities.includes('text-to-image')) {
                throw new Error(`Model ${modelConfig.id} does not support image generation`)
            }

            // Generate the image using the provider
            const result = await provider.complete(options.prompt, {
                format: 'image',
                size: options.size,
                quality: options.quality,
                style: options.style
            })

            return {
                image: result.content,
                usage: {
                    promptTokens: result.tokens.prompt,
                    completionTokens: result.tokens.completion,
                    totalTokens: result.tokens.total
                },
                modelId: result.model,
                finishReason: result.finishReason ?? 'unknown'
            }
        } catch (error) {
            throw new GenerationError(
                'Failed to generate image',
                options.modelId,
                error instanceof Error ? error : undefined
            )
        }
    }
} 