import type { ModelConfig } from "../schemas/modelRegistry";

/**
 * Interface for function definition in model completion
 */
export interface FunctionDefinition {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
}

/**
 * Interface for function call result
 */
export interface FunctionCallResult {
    name: string;
    arguments: Record<string, unknown>;
}

/**
 * Interface for model completion request options
 */
export interface ModelCompletionOptions {
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
    functions?: FunctionDefinition[];
    functionCall?: string | { name: string };
}

/**
 * Interface for model completion response
 */
export interface ModelCompletionResponse {
    text: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    functionCalls?: FunctionCallResult[];
}

/**
 * Interface for model providers
 */
export interface ModelProvider {
    /**
     * Get the model configuration
     */
    getModelConfig(): ModelConfig;

    /**
     * Complete a prompt with the model
     */
    complete(options: ModelCompletionOptions): Promise<ModelCompletionResponse>;
}

/**
 * Abstract base class for model providers
 */
export abstract class BaseModelProvider implements ModelProvider {
    protected modelConfig: ModelConfig;

    constructor(modelConfig: ModelConfig) {
        this.modelConfig = modelConfig;
    }

    /**
     * Get the model configuration
     */
    public getModelConfig(): ModelConfig {
        return this.modelConfig;
    }

    /**
     * Complete a prompt with the model
     * Must be implemented by concrete providers
     */
    public abstract complete(
        options: ModelCompletionOptions,
    ): Promise<ModelCompletionResponse>;

    /**
     * Apply default options based on model configuration
     */
    protected applyDefaultOptions(
        options: ModelCompletionOptions,
    ): ModelCompletionOptions {
        return {
            ...options,
            maxTokens: options.maxTokens || this.modelConfig.maxTokens,
            temperature:
                options.temperature !== undefined
                    ? options.temperature
                    : this.modelConfig.temperature,
        };
    }
}
