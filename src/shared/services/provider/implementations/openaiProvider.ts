/**
 * OpenAI provider implementation
 */
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';
import type { ModelConfig } from '../../model/schemas/modelConfig.ts';
import type { LLMCompletionResult } from '../types.ts';
import type {
    IModelProvider,

} from './provider-interfaces.ts';

import type {
    ModelCompletionFormat,
    ModelCompletionOptions,
    ModelCompletionResponse
} from '@/types.ts';

export class OpenAIProvider implements IModelProvider {
    protected readonly debug: boolean = false;
    protected readonly modelConfig: ModelConfig;

    /**
     * Creates a new OpenAI provider instance
     * @param modelConfig - The model configuration
     */
    constructor(modelConfig: ModelConfig) {
        this.modelConfig = modelConfig;

        // Verify OpenAI API key exists
        const apiKey = process.env['OPENAI_API_KEY'];
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is not set');
        }
    }

    /**
     * Get the model configuration
     */
    public getModelConfig(): ModelConfig {
        return this.modelConfig;
    }

    /**
     * Generate a completion with the OpenAI model
     * Implements the IModelProvider interface method
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

        // Prepare messages for OpenAI
        const messages: ChatCompletionMessageParam[] = [];

        if (finalOptions.prompt) {
            messages.push({
                role: 'system',
                content: finalOptions.prompt
            });
        }

        messages.push({
            role: 'user',
            content: finalOptions.prompt
        });

        try {
            // This is a stub implementation. In a real implementation, 
            // we would use the OpenAI client to make an API call.
            if (this.debug) {
                console.log(`[OpenAIProvider] Generating completion for model: ${this.modelConfig.id}`);
                console.log(`[OpenAIProvider] Messages: ${JSON.stringify(messages, null, 2)}`);
            }

            // Simulate a response for now
            return {
                text: `Response from OpenAI model ${this.modelConfig.id}`,
                usage: {
                    promptTokens: 10,
                    completionTokens: 20,
                    totalTokens: 30
                },
                modelId: this.modelConfig.id,
                finishReason: 'stop'
            };
        } catch (error) {
            console.error('[OpenAIProvider] Error generating completion:', error);
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
