/**
 * Provider interfaces
 * This file defines interfaces that all providers must implement
 */
import type { ModelConfig } from '../../model/schemas/modelConfig.ts';
import type { LLMCompletionResult } from '../types.ts';
import type { ModelCompletionOptions } from '@/types.ts';


/**
 * Interface for model providers
 */
export interface IModelProvider {
    /**
     * Complete a prompt using the model
     */
    complete(prompt: string, options?: ModelCompletionOptions): Promise<LLMCompletionResult>;

    /**
     * Get the current model configuration
     */
    getModelConfig(): ModelConfig;
} 