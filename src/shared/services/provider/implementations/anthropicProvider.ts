/**
 * Anthropic provider implementation
 */
import type { ModelConfig } from '../../model/schemas/modelConfig.ts';
import type { LLMCompletionResult } from '../types.ts';
import type { IModelProvider } from './provider-interfaces.ts';

import type {
    ModelCompletionFormat,
    ModelCompletionOptions,
    ModelCompletionResponse
} from '@/types.ts';

export class AnthropicProvider implements IModelProvider {
    protected readonly debug: boolean = false;
    protected readonly modelConfig: ModelConfig;

    /**
     * Creates a new Anthropic provider instance
     * @param modelConfig - The model configuration
     */
    constructor(modelConfig: ModelConfig) {
        this.modelConfig = modelConfig;

        // Verify Anthropic API key exists
        const apiKey = process.env['ANTHROPIC_API_KEY'];
        if (!apiKey) {
            throw new Error('ANTHROPIC_API_KEY environment variable is not set');
        }
    }

    /**
     * Get the model configuration
     */
    public getModelConfig(): ModelConfig {
        return this.modelConfig;
    }

    /**
     * Generate a completion with the Anthropic model
     */
    public async complete(prompt: string, options?: ModelCompletionOptions): Promise<LLMCompletionResult> {
        // Convert options to ModelCompletionOptions format
        const completionOptions: ModelCompletionOptions = {
            modelId: this.modelConfig.id,
            prompt,
            temperature: options?.['temperature'] as number,
            maxTokens: options?.['maxTokens'] as number,
            format: options?.['format'] as ModelCompletionFormat
        };

        // Use the legacy method
        const response = await this.completeWithOptions(completionOptions);

        // Convert to new format
        return {
            content: response.text || '',
            tokens: {
                prompt: response.usage.promptTokens,
                completion: response.usage.completionTokens,
                total: response.usage.totalTokens
            },
            model: this.modelConfig.id,
            finishReason: 'stop'
        };
    }

    /**
     * Legacy implementation for backward compatibility
     */
    protected async completeWithOptions(options: ModelCompletionOptions): Promise<ModelCompletionResponse> {
        const finalOptions = this.applyDefaultOptions(options);

        try {
            // This is a stub implementation. In a real implementation, 
            // we would use the Anthropic client to make an API call.
            if (this.debug) {
                console.log(`[AnthropicProvider] Generating completion for model: ${this.modelConfig.id}`);
                console.log(`[AnthropicProvider] Prompt: ${finalOptions.prompt}`);
            }

            // Simulate a response for now
            return {
                text: `Response from Anthropic model ${this.modelConfig.id}`,
                modelId: this.modelConfig.id,
                finishReason: 'stop',
                usage: {
                    promptTokens: 10,
                    completionTokens: 20,
                    totalTokens: 30
                }
            };
        } catch (error) {
            console.error('[AnthropicProvider] Error generating completion:', error);
            throw error;
        }
    }

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