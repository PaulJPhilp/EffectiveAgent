import type { AgentConfig } from "@agents/agent-service/types.js"
import { ModelRegistryService } from "../model/modelRegistryService.js"
import type { ModelConfig } from "../model/schemas/modelConfig.js"
import { AnthropicProvider } from "./implementations/anthropicProvider.js"
import { DeepSeekProvider } from "./implementations/deepseekProvider.js"
import { GoogleProvider } from "./implementations/googleProvider.js"
import { GrokProvider } from "./implementations/grokProvider.js"
import { OpenAIProvider } from "./implementations/openaiProvider.js"
import type { BaseModelProvider } from "./modelProvider.js"
import { ProviderRegistryService } from "./providerRegistry.js"

interface ProviderWithConfig {
    provider: BaseModelProvider;
    temperature: number;
}

interface ModelIdentifier {
    readonly modelId: string;
}

class ProviderError extends Error {
    readonly code: string;
    readonly taskName?: string;
    readonly modelId?: string;
    readonly providerType?: string;

    constructor(message: string, details: {
        readonly taskName?: string;
        readonly modelId?: string;
        readonly providerType?: string;
    }) {
        super(message);
        this.name = 'ProviderError';
        this.code = 'PROVIDER_ERROR';
        this.taskName = details.taskName;
        this.modelId = details.modelId;
        this.providerType = details.providerType;
    }
}


/**
 * Factory for creating model providers
 */
export class ProviderFactory {
    private readonly debug: boolean = false;
    private readonly modelRegistry: ModelRegistryService;
    private readonly providerRegistry: ProviderRegistryService;
    constructor(agentConfig: AgentConfig) {
        this.debug = agentConfig.debug || false;
        if (this.debug) {
            console.log('[ProviderFactory] Initializing');
        }
        this.modelRegistry = new ModelRegistryService(agentConfig);
        this.providerRegistry = new ProviderRegistryService(agentConfig);
        if (this.debug) {
            console.log("[ProviderFactory] Provider factory initialized");
        }
    }

    private createProviderError(message: string, details: {
        readonly taskName?: string;
        readonly modelId?: string;
        readonly providerType?: string;
    }): ProviderError {
        return new ProviderError(message, details);
    }

    /**
     * Create a provider for a specific model ID
     */
    public createProviderForModelId(
        modelIdOrIdentifier: string | ModelIdentifier
    ): BaseModelProvider {
        if (this.debug) {
            console.log(`[ProviderFactory] Creating provider for model: ${modelIdOrIdentifier}`);
        }
        const modelId = typeof modelIdOrIdentifier === 'string' ?
            modelIdOrIdentifier :
            modelIdOrIdentifier.modelId;

        const modelConfig = this.modelRegistry.getModelById(modelId);

        if (!modelConfig) {
            throw this.createProviderError('Model not found', { modelId });
        }
        if (this.debug) {
            console.log(`[ProviderFactory] Model config: ${JSON.stringify(modelConfig)}`);
        }

        const providerConfig = this.providerRegistry.getProviderConfig(
            modelConfig.provider
        );
        if (this.debug) {
            console.log(`[ProviderFactory] Provider config: ${JSON.stringify(providerConfig)}`);
        }
        if (!providerConfig) {
            throw this.createProviderError(
                'Provider not found for model',
                {
                    modelId,
                    providerType: modelConfig.provider
                }
            );
        }

        return this.createProvider(modelConfig, providerConfig.type);
    }

    /**
     * Create a default provider
     */
    public createDefaultProvider(): ProviderWithConfig {
        const modelConfig = this.modelRegistry.getDefaultModel();
        if (!modelConfig) {
            throw this.createProviderError(
                'Default model not found in registry',
                {}
            );
        }

        const providerConfig = this.providerRegistry.getProviderConfig(
            modelConfig.provider
        );
        if (!providerConfig) {
            throw this.createProviderError(
                `Provider not found for default model: ${modelConfig.provider}`,
                { providerType: modelConfig.provider }
            );
        }

        return {
            provider: this.createProvider(
                modelConfig,
                providerConfig.type
            ),
            temperature: this.modelRegistry.getDefaultTemperature()
        };
    }

    /**
     * Create a provider instance based on type
     */
    private createProvider(
        modelConfig: ModelConfig,
        providerType: string
    ): BaseModelProvider {
        if (this.debug) {
            console.log(`[ProviderFactory] Creating provider for model: ${modelConfig.provider}`);
        }

        // API keys are now retrieved from environment variables in each provider
        switch (providerType) {
            case 'openai':
                return new OpenAIProvider(modelConfig);
            case 'anthropic':
                return new AnthropicProvider(modelConfig);
            case 'google':
                return new GoogleProvider(modelConfig);
            case 'grok':
                return new GrokProvider(modelConfig);
            case 'deepseek':
                return new DeepSeekProvider(modelConfig);
            default:
                throw this.createProviderError(
                    'Unsupported provider type',
                    { providerType }
                );
        }
    }
} 