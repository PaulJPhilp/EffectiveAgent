import type { ModelConfig } from "../schemas/modelRegistry";
import type { ModelProvider } from "./modelProvider";
import { ModelSelectionFactory } from "./modelSelectionFactory";
import { OpenAIProvider } from "./providers/openaiProvider";

/**
 * Factory for creating model providers based on model configuration
 */
export class ModelProviderFactory {
    private static instance: ModelProviderFactory;
    private modelSelectionFactory: ModelSelectionFactory;
    private providerImplementations: Map<
        string,
        new (
            config: ModelConfig,
        ) => ModelProvider
    > = new Map();

    private constructor(modelSelectionFactory: ModelSelectionFactory) {
        this.modelSelectionFactory = modelSelectionFactory;
    }

    /**
     * Get singleton instance of ModelProviderFactory
     */
    public static async getInstance(): Promise<ModelProviderFactory> {
        if (!ModelProviderFactory.instance) {
            const modelSelectionFactory = await ModelSelectionFactory.getInstance();
            ModelProviderFactory.instance = new ModelProviderFactory(
                modelSelectionFactory,
            );

            // Register provider implementations
            ModelProviderFactory.instance.registerProviderImplementation('openai', OpenAIProvider);

            // Add more provider implementations as needed
            // ModelProviderFactory.instance.registerProviderImplementation('anthropic', AnthropicProvider);
        }
        return ModelProviderFactory.instance;
    }

    /**
     * Register a provider implementation for a specific provider type
     */
    public registerProviderImplementation(
        providerType: string,
        implementation: new (config: ModelConfig) => ModelProvider,
    ): void {
        this.providerImplementations.set(providerType, implementation);
    }

    /**
     * Create a model provider for a specific task
     */
    public createProviderForTask(taskName: string): ModelProvider {
        const modelConfig = this.modelSelectionFactory.selectModelForTask(taskName);
        return this.createProviderForModel(modelConfig);
    }

    /**
     * Create a model provider for a specific model ID
     */
    public createProviderForModelId(modelId: string): ModelProvider {
        const modelConfig = this.modelSelectionFactory.getModelById(modelId);
        return this.createProviderForModel(modelConfig);
    }

    /**
     * Create a model provider for the default model
     */
    public createDefaultProvider(): ModelProvider {
        const modelConfig = this.modelSelectionFactory.getDefaultModel();
        return this.createProviderForModel(modelConfig);
    }

    /**
     * Create a model provider based on model configuration
     */
    private createProviderForModel(modelConfig: ModelConfig): ModelProvider {
        const providerType = modelConfig.provider;
        const ProviderImplementation =
            this.providerImplementations.get(providerType);

        if (!ProviderImplementation) {
            throw new Error(
                `No provider implementation registered for provider type: ${providerType}`,
            );
        }

        return new ProviderImplementation(modelConfig);
    }
}
