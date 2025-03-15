// Import ModelCompletionOptions and related types from our modelProvider.js file
// to ensure type compatibility
import type {
    BaseModelProvider,
    EmbeddingOptions,
    EmbeddingResponse,
    ImageGenerationOptions,
    ImageGenerationResponse,
    ModelCompletionOptions,
    ModelCompletionResponse
} from "../provider/modelProvider.js";
import { ModelSelectionFactory } from "./modelSelectionFactory.js";
import { ModelRegistryService } from "./modelRegistryService.js";
import type { ThinkingLevel } from "../../schemas/modelConfig.js";
import { ProviderFactory } from "../provider/providerFactory.js";

/**
 * Service for interacting with AI models
 */
export class ModelService {
    private providerFactory: ProviderFactory;
    private modelRegistry: ModelRegistryService;

    constructor(
    ) {
        this.providerFactory = new ProviderFactory();
        this.modelRegistry = new ModelRegistryService();
    }

    /**
     * Complete a prompt using a specific model by ID
     */
    public async completeWithModel(
        modelId: string,
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse> {
        console.log(`[ModelService] Starting completion with model ID: ${modelId}`);
        
        try {
            // Create provider directly from the factory
            const provider = this.providerFactory.createProviderForModelId(modelId);
            console.log(`[ModelService] Provider created for model: ${modelId}`);
            
            // Complete the prompt
            const response = await provider.complete(options);
            console.log(`[ModelService] Received response from provider`);
            
            if (!response || !response.text) {
                console.warn(`[ModelService] Warning: Empty or invalid response received`);
            } else {
                console.log(`[ModelService] Response length: ${response.text.length} chars`);
            }
            
            return {
                ...response,
                modelId
            };
        } catch (error) {
            console.error(`[ModelService] Error completing with model ${modelId}:`,
                error instanceof Error ? error.message : String(error));
            console.error(error instanceof Error ? error.stack : 'No stack trace available');
            throw error;
        }
    }

    /**
     * Complete a prompt using a model with a specific thinking level
     */
    public async completeWithThinkingLevel(
        options: ModelCompletionOptions,
        minThinkingLevel: ThinkingLevel
    ): Promise<ModelCompletionResponse> {
        // Get the first available model without using selectModel
        const models = await this.modelRegistry.getAllModels();
        const defaultModel = models.length > 0 ? models[0] : null;
        
        if (!defaultModel) {
            throw new Error("No models available in registry");
        }
        
        const modelId = defaultModel.id;
        const provider = this.providerFactory.createProviderForModelId(modelId);
        return provider.complete(options);
    }

    /**
     * Generate an image using a model with image generation capability
     */
    public async generateImage(
        options: ImageGenerationOptions
    ): Promise<ImageGenerationResponse> {
        // Get the first available model without using selectModel
        const models = await this.modelRegistry.getAllModels();
        const defaultModel = models.length > 0 ? models[0] : null;
        
        if (!defaultModel) {
            throw new Error("No models available in registry");
        }
        
        const modelId = defaultModel.id;
        const provider = this.providerFactory.createProviderForModelId(modelId);

        if (!("generateImage" in provider)) {
            throw new Error(
                `Provider for model ${modelId} does not support image generation`
            );
        }

        // Use the any type to safely bypass the type checking issue
        // since we've already verified the method exists
        return (provider as any).generateImage(options);
    }

    /**
     * Generate embeddings using a model with embedding capability
     */
    public async generateEmbedding(
        options: EmbeddingOptions
    ): Promise<EmbeddingResponse> {
        // Get the first available model without using selectModel
        const models = await this.modelRegistry.getAllModels();
        const defaultModel = models.length > 0 ? models[0] : null;
        
        if (!defaultModel) {
            throw new Error("No models available in registry");
        }
        
        const modelId = defaultModel.id;
        const provider = this.providerFactory.createProviderForModelId(modelId);

        if (!("generateEmbedding" in provider)) {
            throw new Error(
                `Provider for model ${modelId} does not support embeddings`
            );
        }

        // Use the any type to safely bypass the type checking issue
        // since we've already verified the method exists
        return (provider as any).generateEmbedding(options);
    }

    /**
     * Complete a prompt using the default model
     */
    public async completeWithDefaultModel(
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse> {
        // Get the first available model without using selectModel
        const models = await this.modelRegistry.getAllModels();
        const defaultModel = models.length > 0 ? models[0] : null;
        
        if (!defaultModel) {
            throw new Error("No models available in registry");
        }
        
        const modelId = defaultModel.id;
        const provider = this.providerFactory.createProviderForModelId(modelId);
        const response = await provider.complete(options);
        return {
            ...response,
            modelId
        };
    }
} 