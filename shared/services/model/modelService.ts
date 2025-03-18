// Import ModelCompletionOptions and related types from our modelProvider.js file
// to ensure type compatibility
import type { ModelIdentifier } from "./types.js";
import type {
    BaseModelProvider,
    EmbeddingOptions,
    EmbeddingResponse,
    ImageGenerationOptions,
    ImageGenerationResponse,
    ModelCompletionOptions,
    ModelCompletionResponse
} from "../provider/modelProvider.js";
import { ProviderFactory } from "../provider/providerFactory.js";
import { ModelRegistryService } from "./modelRegistryService.js";
import type { ThinkingLevel } from "./schemas/modelConfig.js";

/**
 * Service for interacting with AI models
 */
interface ModelServiceOptions {
    readonly configPath: string;
}

interface ModelErrorOptions {
    readonly message: string;
    readonly modelId?: string;
}

class ModelError extends Error {

    readonly code: string = 'MODEL_ERROR';
    readonly modelId?: string;

    constructor({ message, modelId }: ModelErrorOptions) {
        super(message); 
        this.name = 'ModelError';
        this.modelId = modelId;
    }
}

export class ModelService {
    readonly debug: boolean = false;
    private readonly providerFactory: ProviderFactory;
    private readonly modelRegistry: ModelRegistryService;
    private readonly configPath: string = "";

    constructor(options: ModelServiceOptions) {
        if (this.debug) {
            console.log(`[ModelService] Initializing with config path: ${options.configPath}`);
        }
        this.providerFactory = new ProviderFactory({ configPath: options.configPath });
        this.modelRegistry = new ModelRegistryService({ modelsConfigPath: options.configPath });
        this.configPath = options.configPath;
    }

    private createModelError(message: string, modelId?: string): ModelError {
        return new ModelError({ message, modelId });
    }

    private async getDefaultModel(): Promise<ModelIdentifier> {
        const models = this.modelRegistry.getAllModels();
        const defaultModel = models[0];
        if (!defaultModel) {
            throw this.createModelError('No models available in registry');
        }
        return { modelId: defaultModel.id };
    }

    private async createProvider(modelId: string): Promise<BaseModelProvider> { 
        try {
            if (this.debug) {
                console.log(`[ModelService] Creating provider for model: ${modelId}`);
            }
            const provider = this.providerFactory.createProviderForModelId(modelId);
            return provider;
        } catch (error) {
            const message = error instanceof Error ?
                error.message :
                'Unknown error creating provider';
            throw this.createModelError(
                `Failed to create provider: ${message}`,
                modelId
            );
        }
    }

    /**
     * Complete a prompt using a specific model by ID
     */
    public async completeWithModel(
        { modelId }: ModelIdentifier,
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse> {
        if (this.debug) {
            console.log(`[ModelService] Completing prompt for model: ${modelId}`);
        }
        const provider = await this.createProvider(modelId);
        const response = await provider.complete(options);
        return { ...response, modelId };
    }

    /**
     * Generate an image using a model with image generation capability
     */
    public async generateImage(
        options: ImageGenerationOptions
    ): Promise<ImageGenerationResponse> {
        const { modelId } = await this.getDefaultModel();
        const provider = await this.createProvider(modelId);

        if (!('generateImage' in provider)) {
            throw this.createModelError(
                `Provider for model ${modelId} does not support image generation`,
                modelId
            );
        }

        // Type assertion after runtime check
        const imageProvider = provider as BaseModelProvider & {
            generateImage: (opts: ImageGenerationOptions) =>
                Promise<ImageGenerationResponse>
        };
        return imageProvider.generateImage(options);
    }

    /**
     * Generate embeddings using a model with embedding capability
     */
    public async generateEmbedding(
        options: EmbeddingOptions
    ): Promise<EmbeddingResponse> {
        const { modelId } = await this.getDefaultModel();
        const provider = await this.createProvider(modelId);

        if (!('generateEmbedding' in provider)) {
            throw this.createModelError(
                `Provider for model ${modelId} does not support embeddings`,
                modelId
            );
        }

        // Type assertion after runtime check
        const embeddingProvider = provider as BaseModelProvider & {
            generateEmbedding: (opts: EmbeddingOptions) =>
                Promise<EmbeddingResponse>
        };
        return embeddingProvider.generateEmbedding(options);
    }

    /**
     * Complete a prompt using the default model
     */
    public async completeWithDefaultModel(
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse> {
        const { modelId } = await this.getDefaultModel();
        const provider = await this.createProvider(modelId);
        const response = await provider.complete(options);
        return { ...response, modelId };
    }
} 