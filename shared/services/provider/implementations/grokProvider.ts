import { generateText } from "ai";
import type { ModelConfig } from "../../model/schemas/modelConfig.js";
import type {
    HandlerConfig,
    ModelCompletionOptions, ModelCompletionResponse,
    RunnableTask
} from "../modelProvider.js";
import { BaseModelProvider } from "../modelProvider.js";
import { createXai } from "@ai-sdk/xai";

/**
 * Provider implementation for Grok (xAI) models
 */
export class GrokProvider extends BaseModelProvider {
    private apiKey: string;
    private xaiProvider: ReturnType<typeof createXai>;

    /**
     * Creates a new GrokProvider instance
     * @param modelConfig - Configuration for the model
     */
    constructor(modelConfig: ModelConfig) {
        super(modelConfig);
        
        // Get API key from environment variables
        const apiKey = process.env.GROK_API_KEY;
        
        if (!apiKey) {
            throw new Error('GROK_API_KEY environment variable is not set');
        }
        
        this.apiKey = apiKey;
        
        // Initialize the xAI provider with API key
        this.xaiProvider = createXai({
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
        console.log(`[GROK][${taskId}] Completing prompt with model ${this.modelConfig.id}`);

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
                model: this.xaiProvider(this.modelConfig.id),
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


