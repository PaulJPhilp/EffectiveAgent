
import type { ModelConfig, ThinkingLevel } from '../model/schemas/modelConfig.js';
import { APICallError, type GenerateTextResult, type ToolSet } from "ai";

export interface FunctionDefinition {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
}

export interface FunctionCallResult {
    name: string;
    arguments: Record<string, unknown>;
}

export interface ModelCompletionOptions {
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
    thinkingLevel?: ThinkingLevel;
    maxRetries?: number;
    functions?: FunctionDefinition[];
    functionCall?: string | { name: string };
    stopSequences?: string[];
}

export interface ModelCompletionResponse {
    text: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    functionCalls?: FunctionCallResult[];
    modelId: string;
    providerResponse: GenerateTextResult<ToolSet, unknown>;
}

export interface ImageGenerationOptions {
    prompt: string;
    size?: string;
    quality?: string;
    style?: string;
    numberOfImages?: number;
}

export interface ImageGenerationResponse {
    images: string[];
    usage: {
        promptTokens: number;
        totalTokens: number;
    };
    [key: string]: unknown;
}

export interface EmbeddingOptions {
    input: string | string[];
    model?: string;
    [key: string]: unknown;
}

export interface EmbeddingResponse {
    embeddings: number[][];
    usage: {
        promptTokens: number;
        totalTokens: number;
    };
    [key: string]: unknown;
}

export type RunnableTask = (
    options: ModelCompletionOptions
) => Promise<ModelCompletionResponse>;

export interface HandlerConfig {
    retries: number;
    maxRetries: number;
    error: unknown;
    options: ModelCompletionOptions;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ModelProvider {
    getModelConfig(): Record<string, unknown>;
    complete(
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse>;
    generateImage?(options: ImageGenerationOptions): Promise<ImageGenerationResponse>;
    generateEmbedding?(options: EmbeddingOptions): Promise<EmbeddingResponse>;
}

export abstract class BaseModelProvider implements ModelProvider {
    protected debug: boolean = false;
    protected modelConfig: ModelConfig;

    constructor(modelConfig: ModelConfig) {
        this.modelConfig = modelConfig;
    }

    private extractWaitTime(errorMessage: string): number | null {
        const match = errorMessage.match(/Please try again in ([0-9.]+)s/);
        if (match && match[1]) {
            return Math.ceil(parseFloat(match[1]) * 1000) + 100;
        }
        return null;
    }

    private isRateLimitError(error: unknown): boolean {
        if (error instanceof APICallError) {
            const data = error.data as { error: { code: string | number, status: string } };
            if (!data.error) {
                console.warn(`[ModelProvider] Unexpected error: ${JSON.stringify(data, null, 2)}`);
                throw error
            }
            if (typeof data.error.code === 'number') {  // Google Error
                return data.error.status === 'RESOURCES_EXHAUSTED';
            }
            return data.error.code === 'rate_limit_exceeded';
        }
        return false;
    }

    protected validateOptions(options: ModelCompletionOptions): void {
        if (options.maxTokens !== undefined && options.maxTokens <= 0) {
            throw new Error('Invalid maxTokens value');
        }
        if (
            options.temperature !== undefined &&
            (options.temperature < 0 || options.temperature > 1)
        ) {
            throw new Error('Temperature must be between 0 and 1');
        }
        if (!options.prompt || options.prompt.trim().length === 0) {
            throw new Error('Empty prompt is not allowed');
        }
    }

    protected async runTask(
        task: RunnableTask,
        handlerConfig: HandlerConfig
    ): Promise<ModelCompletionResponse> {
        if (this.debug) {
            console.log(`[ModelProvider] Running task with model ${this.modelConfig.id}`);
        }
        this.validateOptions(handlerConfig.options);
        try {
            const result = await task(handlerConfig.options);
            if (this.debug) {
                console.log(`[ModelProvider] Task completed with model ${this.modelConfig.id}`);
            }
            return result;
        } catch (error: any) {
            return this.handleError(error, handlerConfig, task);
        }
    }

    protected async handleError(
        error: Error,
        handlerConfig: HandlerConfig,
        task: RunnableTask
    ): Promise<ModelCompletionResponse> {
        if (this.debug) {
            console.error(`[ModelProvider] Error on model ${this.modelConfig.id}:`, error.message);
        }

        if (this.isRateLimitError(error)) {
            let waitTime = this.extractWaitTime(error.message) || 1000;
            waitTime *= handlerConfig.retries;
            await sleep(waitTime);
        }

        if (handlerConfig.retries < handlerConfig.maxRetries) {
            handlerConfig.retries += 1;
            if (this.debug) {
                console.log(`[ModelProvider] Retrying task (${handlerConfig.retries}/${handlerConfig.maxRetries}) for model ${this.modelConfig.id}`);
            }
            try {
                return await task(handlerConfig.options);
            } catch (err) {
                return this.handleError(err as Error, handlerConfig, task);
            }
        } else {
            if (this.debug) {
                console.error(`[ModelProvider] Reached maxRetries (${handlerConfig.maxRetries}) for model ${this.modelConfig.id}`);
            }
            throw error;
        }
    }

    public getModelConfig(): Record<string, unknown> {
        return this.modelConfig;
    }

    public abstract complete(
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse>;

    protected applyDefaultOptions(
        options: ModelCompletionOptions
    ): ModelCompletionOptions {
        const optionsWithDefaults = {
            ...options,
            maxTokens: options.maxTokens ?? this.modelConfig.maxTokens,
            temperature: options.temperature !== undefined ? options.temperature : 0.2,
            maxRetries: options.maxRetries !== undefined ? options.maxRetries : 0
        };
        if (options.systemPrompt) {
            optionsWithDefaults.systemPrompt = options.systemPrompt.trim();
        }
        if (options.thinkingLevel) {
            optionsWithDefaults.thinkingLevel = options.thinkingLevel;
        }
        return optionsWithDefaults;
    }

    protected wrapResponse(
        response: GenerateTextResult<ToolSet, unknown>
    ): ModelCompletionResponse {
        return {
            text: response.text,
            usage: response.usage,
            modelId: this.modelConfig.id,
            providerResponse: response
        };
    }
}
