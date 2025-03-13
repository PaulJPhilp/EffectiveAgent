import type {
    ModelCompletionOptions,
    ModelCompletionResponse,
} from "./modelProvider.js";
import { ModelProviderFactory } from "./modelProviderFactory.js";

/**
 * Service for interacting with AI models
 */
export class ModelService {
    private static instance: ModelService;
    private modelProviderFactory: ModelProviderFactory;

    private constructor(modelProviderFactory: ModelProviderFactory) {
        this.modelProviderFactory = modelProviderFactory;
    }

    /**
     * Get singleton instance of ModelService
     */
    public static async getInstance(): Promise<ModelService> {
        if (!ModelService.instance) {
            const modelProviderFactory = await ModelProviderFactory.getInstance();
            ModelService.instance = new ModelService(modelProviderFactory);
        }
        return ModelService.instance;
    }

    /**
     * Complete a prompt using the model for a specific task
     * @param taskName The name of the task
     * @param options Completion options
     */
    public async completeWithTaskModel(
        taskName: string,
        options: ModelCompletionOptions,
    ): Promise<ModelCompletionResponse> {
        const provider = this.modelProviderFactory.createProviderForTask(taskName);
        console.log(
            `Using model ${provider.getModelConfig().modelName} for task: ${taskName}`,
        );
        return provider.complete(options);
    }

    /**
     * Complete a prompt using a specific model by ID
     * @param modelId The model ID
     * @param options Completion options
     */
    public async completeWithModel(
        modelId: string,
        options: ModelCompletionOptions,
    ): Promise<ModelCompletionResponse> {
        const provider =
            this.modelProviderFactory.createProviderForModelId(modelId);
        return provider.complete(options);
    }

    /**
     * Complete a prompt using the default model
     * @param options Completion options
     */
    public async completeWithDefaultModel(
        options: ModelCompletionOptions,
    ): Promise<ModelCompletionResponse> {
        const provider = this.modelProviderFactory.createDefaultProvider();
        return provider.complete(options);
    }
}
