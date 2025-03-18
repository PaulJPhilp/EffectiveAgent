import { generateText } from "ai";
import type { ModelConfig } from "../../model/schemas/modelConfig.js";
import type {
    HandlerConfig,
    ModelCompletionOptions, ModelCompletionResponse,
    RunnableTask
} from "../modelProvider.js";
import { BaseModelProvider } from "../modelProvider.js";
import { deepseek, createDeepSeek } from "@ai-sdk/deepseek";

/**
 * Provider implementation for DeepSeek models
 */
export class DeepSeekProvider extends BaseModelProvider {
    private apiKey: string;
    private deepseekProvider: ReturnType<typeof createDeepSeek>;

    /**
     * Creates a new DeepSeekProvider instance
     * @param modelConfig - Configuration for the model
     */
    constructor(modelConfig: ModelConfig) {
        super(modelConfig);
        
        // Get API key from environment variables
        const apiKey = process.env.DEEPSEEK_API_KEY;
        
        if (!apiKey) {
            throw new Error(
                'DEEPSEEK_API_KEY environment variable is not set'
            );
        }
        
        this.apiKey = apiKey;
        
        // Initialize the DeepSeek provider with API key
        this.deepseekProvider = createDeepSeek({
            apiKey: this.apiKey
        });
    }

    /**
         * Complete a prompt with the model
         * Implements the abstract method from BaseModelProvider
         */
    public async complete(
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse> {
        const taskId = new Date().toISOString();
        console.log(`[OPENAI][${taskId}] Completing prompt with model ${this.modelConfig.id}`);

        const handlerConfig: HandlerConfig = {
            retries: 0,
            maxRetries: options.maxRetries ?? 4,
            error: null,
            options: options,
        };

        const completeTask: RunnableTask = async (opts) => {
            //console.log(`[OPENAI][${taskId}] Running task with model ${this.modelConfig.id}`);
            const optionsWithDefaults = this.applyDefaultOptions(opts);
            const response = generateText({
                model: this.deepseekProvider(this.modelConfig.id),
                prompt: optionsWithDefaults.prompt,
                temperature: optionsWithDefaults.temperature ?? 0.2,
                maxRetries: 0 // We'll handle retries ourselves
            });
            //console.log(`[OPENAI][${taskId}] Task completed with model ${this.modelConfig.id}`);
            return this.wrapResponse(await response);
        };

        // Leverage the runTask method to ensure validation and retry logic
        const result = await this.runTask(completeTask, handlerConfig);
        return result;
    }
}
