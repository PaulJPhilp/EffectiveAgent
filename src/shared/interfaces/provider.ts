import type { ModelConfig } from "../schemas/modelRegistry.js"

/**
 * Options for model completion requests
 */
export interface ModelCompletionOptions {
    prompt: string
    systemPrompt?: string
    temperature?: number
    maxTokens?: number
    functions?: FunctionDefinition[]
    functionCall?: string | { name: string }
}

/**
 * Response from model completion requests
 */
export interface ModelCompletionResponse {
    text: string
    usage: {
        promptTokens: number
        completionTokens: number
        totalTokens: number
    }
    modelId?: string
}

/**
 * Options for image generation requests
 */
export interface ImageGenerationOptions {
    prompt: string
    numberOfImages?: number
    size?: string
    responseFormat?: string
}

/**
 * Response from image generation requests
 */
export interface ImageGenerationResponse {
    images: string[]
    usage: {
        promptTokens: number
        totalTokens: number
    }
}

/**
 * Options for embedding generation requests
 */
export interface EmbeddingOptions {
    input: string | string[]
    model?: string
}

/**
 * Response from embedding generation requests
 */
export interface EmbeddingResponse {
    embeddings: number[][]
    usage: {
        promptTokens: number
        totalTokens: number
    }
}

/**
 * Function definition for model function calling
 */
export interface FunctionDefinition {
    name: string
    description: string
    parameters: {
        type: string
        properties: Record<string, unknown>
        required?: string[]
    }
}

/**
 * Base model provider interface
 */
export abstract class BaseModelProvider {
    protected modelConfig: ModelConfig

    constructor(modelConfig: ModelConfig) {
        this.modelConfig = modelConfig
    }

    public getModelConfig(): ModelConfig {
        return this.modelConfig
    }

    protected applyDefaultOptions(options: ModelCompletionOptions): ModelCompletionOptions {
        return {
            ...options,
            temperature: options.temperature ?? 0.7,
            maxTokens: options.maxTokens ?? this.modelConfig.maxTokens
        }
    }

    abstract complete(options: ModelCompletionOptions): Promise<ModelCompletionResponse>
} 