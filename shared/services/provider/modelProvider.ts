import type { ModelConfig } from '../../schemas/modelConfig.js'

/**
 * Interface for function definition in model completion
 */
export interface FunctionDefinition {
    name: string
    description?: string
    parameters?: Record<string, unknown>
}

/**
 * Interface for function call result
 */
export interface FunctionCallResult {
    name: string
    arguments: Record<string, unknown>
}

/**
 * Interface for model completion request options
 */
export interface ModelCompletionOptions {
    prompt: string
    systemPrompt?: string
    maxTokens?: number
    temperature?: number
    functions?: FunctionDefinition[]
    functionCall?: string | { name: string }
    stopSequences?: string[]
    [key: string]: unknown
}

/**
 * Interface for model completion response
 */
export interface ModelCompletionResponse {
    text: string
    usage: {
        promptTokens: number
        completionTokens: number
        totalTokens: number
    }
    functionCalls?: FunctionCallResult[]
    modelId: string
    [key: string]: unknown
}

/**
 * Options for image generation
 */
export interface ImageGenerationOptions {
    prompt: string
    size?: string // e.g., "1024x1024"
    quality?: string // e.g., "standard", "hd"
    style?: string // e.g., "vivid", "natural"
    numberOfImages?: number
    [key: string]: unknown
}

/**
 * Response from image generation
 */
export interface ImageGenerationResponse {
    images: string[] // URLs or base64-encoded images
    usage: {
        promptTokens: number
        totalTokens: number
    }
    [key: string]: unknown
}

/**
 * Options for embedding generation
 */
export interface EmbeddingOptions {
    input: string | string[]
    model?: string
    [key: string]: unknown
}

/**
 * Response from embedding generation
 */
export interface EmbeddingResponse {
    embeddings: number[][]
    usage: {
        promptTokens: number
        totalTokens: number
    }
    [key: string]: unknown
}

/**
 * Interface for model providers
 */
export interface ModelProvider {
    /**
     * Get the model configuration
     */
    getModelConfig(): Record<string, unknown>

    /**
     * Complete a prompt with the model
     */
    complete(options: ModelCompletionOptions): Promise<ModelCompletionResponse>

    generateImage?(options: ImageGenerationOptions): Promise<ImageGenerationResponse>

    generateEmbedding?(options: EmbeddingOptions): Promise<EmbeddingResponse>
}

/**
 * Abstract base class for model providers
 */
export abstract class BaseModelProvider implements ModelProvider {
    protected modelConfig: ModelConfig

    constructor(modelConfig: ModelConfig) {
        this.modelConfig = modelConfig
    }

    /**
     * Get the model configuration
     */
    public getModelConfig(): Record<string, unknown> {
        return this.modelConfig
    }

    /**
     * Complete a prompt with the model
     * Must be implemented by concrete providers
     */
    public abstract complete(
        options: ModelCompletionOptions,
    ): Promise<ModelCompletionResponse>

    /**
     * Apply default options based on model configuration
     */
    protected applyDefaultOptions(
        options: ModelCompletionOptions,
    ): ModelCompletionOptions {
        return {
            ...options,
            maxTokens: options.maxTokens || this.modelConfig.maxTokens,
            temperature: options.temperature !== undefined ? options.temperature : 0.2,
        }
    }

    /**
     * Add model ID to response
     */
    protected addModelIdToResponse(response: ModelCompletionResponse): ModelCompletionResponse {
        return {
            ...response,
            modelId: this.modelConfig.id
        }
    }
} 