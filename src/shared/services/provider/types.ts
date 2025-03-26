
import type { Provider } from "./schemas/index.ts";
import type { ModelConfig } from '../model/schemas/modelConfig.ts';

/**
 * Result of LLM completion
 */
export interface LLMCompletionResult {
    content: string;
    tokens: {
        prompt: number;
        completion: number;
        total: number;
    };
    model: string;
    finishReason?: string;
}

/**
 * Provider interfaces
 * This file defines interfaces that all providers must implement
 */



export interface ModelCompletionOptions {
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    format?: 'text' | 'json' | 'image' | 'embedding';
}

export interface ModelCompletionResponse {
    text?: string;
    json?: Record<string, unknown>;
    image?: string;
    embedding?: number[];
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

/**
 * Interface for model providers
 */
export interface IModelProvider {
    /**
     * Complete a prompt using the model
     */
    complete(prompt: string, options?: Record<string, unknown>): Promise<LLMCompletionResult>;

    /**
     * Get the current model configuration
     */
    getModelConfig(): ModelConfig;
} 

/**
 * Configuration options for the ProviderConfigurationService
 */
export interface ProviderConfigurationOptions {
    readonly configPath: string;
    readonly environment?: string;
}

/**
 * Error details for provider-related errors
 */
export interface ProviderErrorDetails {
    readonly name: string;
    readonly message: string;
    readonly code: string;
    readonly cause?: unknown;
}

/**
 * Provider not found error
 */
export class ProviderNotFoundError extends Error {
    readonly code: string;

    constructor(providerId: string) {
        super(`Provider not found: ${providerId}`);
        this.name = 'ProviderNotFoundError';
        this.code = 'PROVIDER_NOT_FOUND';
    }
}

/**
 * Interface for ProviderConfigurationService
 */
export interface IProviderConfigurationService {
    loadConfigurations(): Promise<void>;
    getProviderConfig(providerId: string): Provider;
    getDefaultProviderConfig(): Provider;
    getAllProviderConfigs(): ReadonlyArray<Provider>;
    clearCache(): void;
}

/**
 * Interface for ProviderService
 */
export interface IProviderService {
    getProvider(name: string): Promise<IModelProvider>;
    getProviderForModel(modelId: string): Promise<IModelProvider>;
    validateProvider(provider: string): Promise<boolean>;
}

/**
 * Token identifiers for dependency injection
 */
export const PROVIDER_TOKENS = {
    providerService: Symbol('providerService'),
    providerConfigService: Symbol('providerConfigService')
}; 