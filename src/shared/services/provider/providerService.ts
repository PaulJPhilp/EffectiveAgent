import type { AgentConfig } from '../../../agents/agent-service/types.ts';
import { ConfigurationService } from '../configuration/configurationService.ts';
import type { ValidationResult } from '../configuration/types.ts';
import type { ModelConfig } from '../model/schemas/modelConfig.ts';
import {
    AnthropicProvider,
    DeepSeekProvider,
    GoogleProvider,
    GrokProvider,
    OpenAIProvider
} from './implementations/index.ts';
import type { IModelProvider } from './implementations/provider-interfaces.ts';
import type { ProvidersFile } from './schemas/providerConfig.ts';
import { ProvidersFileSchema } from './schemas/providerConfig.ts';
import type { IProviderConfigurationService, IProviderService } from './types.ts';
import { ProviderNotFoundError } from './types.ts';

/**
 * Service for managing model providers with dependency injection
 * Handles provider creation, retrieval, and validation for different AI model providers
 * Supports OpenAI, Anthropic, Google, Grok, and DeepSeek providers
 */
export class ProviderService extends ConfigurationService<ProvidersFile> implements IProviderService {
    private readonly debug: boolean;
    private readonly providerConfigService: IProviderConfigurationService;
    private readonly modelConfigService: any;

    /**
     * Create a new ProviderService
     * @param agentConfig - Agent configuration
     * @param providerConfigService - Provider configuration service
     * @param modelConfigService - Model configuration service
     */
    constructor(
        agentConfig: AgentConfig,
        providerConfigService: IProviderConfigurationService,
        modelConfigService: any
    ) {
        super({ validateOnLoad: true });
        this.debug = agentConfig.debug || false;
        this.providerConfigService = providerConfigService;
        this.modelConfigService = modelConfigService;

        if (this.debug) {
            console.log(`[ProviderService] Initialized for agent: ${agentConfig.name}`);
        }
    }

    /**
     * Validate provider configuration
     */
    protected validateConfig(config: ProvidersFile): ValidationResult {
        const result = ProvidersFileSchema.safeParse(config);
        return {
            isValid: result.success,
            errors: result.success ? undefined : [result.error.message]
        };
    }

    /**
     * Create appropriate provider based on type
     */
    private createProvider(modelConfig: ModelConfig, providerType: string): IModelProvider {
        if (this.debug) {
            console.log(`[ProviderService] Creating provider of type: ${providerType}`);
        }

        // Create a factory object that maps provider types to creator functions
        const providerFactory = {
            'openai': (config: ModelConfig) => new OpenAIProvider(config),
            'anthropic': (config: ModelConfig) => new AnthropicProvider(config),
            'google': (config: ModelConfig) => new GoogleProvider(config),
            'grok': (config: ModelConfig) => new GrokProvider(config),
            'deepseek': (config: ModelConfig) => new DeepSeekProvider(config)
        };

        // Get the creator function for this provider type
        const creator = providerFactory[providerType as keyof typeof providerFactory];

        if (!creator) {
            throw new Error(`Unsupported provider type: ${providerType}`);
        }

        // Create and return the provider
        return creator(modelConfig);
    }

    /**
     * Gets a provider instance by name
     * @param name - Name of the provider to retrieve (e.g., 'openai', 'anthropic')
     * @returns Promise resolving to the provider instance
     * @throws {ProviderNotFoundError} If the provider doesn't exist or cannot be created
     * @example
     * ```typescript
     * const openaiProvider = await providerService.getProvider('openai');
     * const response = await openaiProvider.complete('Hello, world!');
     * ```
     */
    public async getProvider(name: string): Promise<IModelProvider> {
        if (this.debug) {
            console.log(`[ProviderService] Getting provider: ${name}`);
        }

        try {
            const providerConfig = this.providerConfigService.getProviderConfig(name);
            const defaultConfig = this.modelConfigService.getDefaultModel();

            // Use a model config associated with this provider
            const modelConfig = {
                ...defaultConfig,
                provider: name
            };

            return this.createProvider(modelConfig, providerConfig.type);
        } catch (error) {
            throw new ProviderNotFoundError(name);
        }
    }

    /**
     * Gets a provider instance for a specific model
     * @param modelId - ID of the model to get the provider for (e.g., 'gpt-4', 'claude-2')
     * @returns Promise resolving to the provider instance configured for the model
     * @throws {ProviderNotFoundError} If the provider for the model doesn't exist
     * @example
     * ```typescript
     * const gpt4Provider = await providerService.getProviderForModel('gpt-4');
     * const response = await gpt4Provider.complete('Explain quantum computing');
     * ```
     */
    public async getProviderForModel(modelId: string): Promise<IModelProvider> {
        try {
            const modelConfig = this.modelConfigService.getModel(modelId);
            const providerConfig = this.providerConfigService.getProviderConfig(
                modelConfig.provider
            );

            return this.createProvider(modelConfig, providerConfig.type);
        } catch (error) {
            throw new ProviderNotFoundError(modelId);
        }
    }

    /**
     * Validates if a provider exists and is properly configured
     * @param provider - Name of the provider to validate
     * @returns Promise resolving to true if the provider exists and is properly configured, false otherwise
     * @example
     * ```typescript
     * if (await providerService.validateProvider('openai')) {
     *   const provider = await providerService.getProvider('openai');
     *   // Use the provider...
     * } else {
     *   console.error('OpenAI provider is not properly configured');
     * }
     * ```
     */
    public async validateProvider(provider: string): Promise<boolean> {
        try {
            return !!this.providerConfigService.getProviderConfig(provider);
        } catch (error) {
            return false;
        }
    }
} 