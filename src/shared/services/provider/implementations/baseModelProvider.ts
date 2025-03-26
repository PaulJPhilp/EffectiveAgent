/**
 * Base class for all model providers
 * Provides common functionality and defines the interface
 */
import type { ModelCompletionOptions, ModelCompletionResponse } from '@/types.ts';
import type { ModelConfig } from '../../model/schemas/modelConfig.ts';
import type { LLMCompletionResult } from '../types.ts';
import type { IModelProvider } from './provider-interfaces.ts';



/**
 * Base class for model providers
 */
export abstract class BaseModelProvider implements IModelProvider {
    protected readonly debug: boolean = false;
    protected readonly modelConfig: ModelConfig;

    /**
     * Create a new BaseModelProvider
     * @param modelConfig - The model configuration
     */
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
     * Complete a prompt (IModelProvider method)
     */
    public abstract complete(prompt: string, options?: ModelCompletionOptions): Promise<LLMCompletionResult>;

    /**
     * Legacy method to complete a prompt
     * Implementations should override this to provide backward compatibility
     */
    protected abstract completeWithOptions(options: ModelCompletionOptions): Promise<ModelCompletionResponse>;

    /**
     * Apply default options to completion options
     */
    protected applyDefaultOptions(options: ModelCompletionOptions): ModelCompletionOptions {
        return {
            ...options,
            temperature: options.temperature ?? (this.modelConfig as any).temperature ?? 0.7,
            maxTokens: options.maxTokens ?? (this.modelConfig as any).maxTokens ?? 1000,
            format: options.format ?? 'text'
        };
    }
} 