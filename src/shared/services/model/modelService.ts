import { ModelSelectionService } from "../../implementations/model/modelSelection.js";
import type { IModelSelectionService } from "../../interfaces/model.js";
import type {
    BaseModelProvider,
    EmbeddingOptions,
    EmbeddingResponse,
    ImageGenerationOptions,
    ImageGenerationResponse,
    ModelCompletionOptions,
    ModelCompletionResponse
} from "../../interfaces/provider.js";
import type { ThinkingLevel } from "../../schemas/modelConfig.js";
import { ProviderFactory } from "../provider/providerFactory.js";

/**
 * Service for interacting with AI models
 */
export class ModelService {
    private static instance: ModelService;
    private providerFactory: ProviderFactory;
    private modelSelection: IModelSelectionService;

    private constructor(providerFactory: ProviderFactory, modelSelection: IModelSelectionService) {
        this.providerFactory = providerFactory;
        this.modelSelection = modelSelection;
    }

    public static async getInstance(): Promise<ModelService> {
        if (!ModelService.instance) {
            const [providerFactory, models] = await Promise.all([
                ProviderFactory.getInstance(),
                // In a real implementation, this would load from a registry
                Promise.resolve([]) // Placeholder for model configs
            ]);
            const modelSelection = new ModelSelectionService(models);
            ModelService.instance = new ModelService(providerFactory, modelSelection);
        }
        return ModelService.instance;
    }

    /**
     * Complete a prompt using a specific model by ID
     */
    public async completeWithModel(
        modelId: string,
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse> {
        const provider = this.providerFactory.createProviderForModelId(modelId);
        const response = await provider.complete(options);
        return {
            ...response,
            modelId
        };
    }

    /**
     * Complete a prompt using a model with a specific thinking level
     */
    public async completeWithThinkingLevel(
        options: ModelCompletionOptions,
        minThinkingLevel: ThinkingLevel
    ): Promise<ModelCompletionResponse> {
        const modelResult = this.modelSelection.selectModel({
            capabilities: ["reasoning"],
            thinkingLevel: minThinkingLevel
        });
        const provider = this.providerFactory.createProviderForModelId(modelResult.model.id);
        return provider.complete(options);
    }

    /**
     * Generate an image using a model with image generation capability
     */
    public async generateImage(
        options: ImageGenerationOptions
    ): Promise<ImageGenerationResponse> {
        const modelResult = this.modelSelection.selectModel({
            capabilities: ["text-to-image"]
        });
        const provider = this.providerFactory.createProviderForModelId(modelResult.model.id);

        if (!("generateImage" in provider)) {
            throw new Error(`Provider for model ${modelResult.model.id} does not support image generation`);
        }

        const imageProvider = provider as BaseModelProvider & { generateImage: (options: ImageGenerationOptions) => Promise<ImageGenerationResponse> };
        return imageProvider.generateImage(options);
    }

    /**
     * Generate embeddings using a model with embedding capability
     */
    public async generateEmbedding(
        options: EmbeddingOptions
    ): Promise<EmbeddingResponse> {
        const modelResult = this.modelSelection.selectModel({
            capabilities: ["embeddings"]
        });
        const provider = this.providerFactory.createProviderForModelId(modelResult.model.id);

        if (!("generateEmbedding" in provider)) {
            throw new Error(`Provider for model ${modelResult.model.id} does not support embeddings`);
        }

        const embeddingProvider = provider as BaseModelProvider & { generateEmbedding: (options: EmbeddingOptions) => Promise<EmbeddingResponse> };
        return embeddingProvider.generateEmbedding(options);
    }

    /**
     * Complete a prompt using the default model
     */
    public async completeWithDefaultModel(
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse> {
        const modelResult = this.modelSelection.selectModel({
            capabilities: ["text-generation"]
        });
        const provider = this.providerFactory.createProviderForModelId(modelResult.model.id);
        const response = await provider.complete(options);
        return {
            ...response,
            modelId: modelResult.model.id
        };
    }
} 