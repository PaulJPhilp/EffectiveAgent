import { APICallError, generateText } from "ai";
import { experimental_generateImage as generateImage } from 'ai';
import type { ModelConfig } from "../../model/schemas/modelConfig.js";
import type {
    ImageGenerationOptions, ImageGenerationResponse,
    ModelCompletionOptions, ModelCompletionResponse
} from "../modelProvider.js";
import { BaseModelProvider } from "../modelProvider.js";
import { openai } from "@ai-sdk/openai"
import type { HandlerConfig, RunnableTask } from "../modelProvider.js";


/**
 * Provider implementation for OpenAI models
 */
export class OpenAIProvider extends BaseModelProvider {
    private apiKey: string;

    /**
     * Creates a new OpenAIProvider instance
     * @param modelConfig - Configuration for the model
     */
    constructor(modelConfig: ModelConfig) {
        super(modelConfig);

        // Get API key from environment variables
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is not set');
        }

        this.apiKey = apiKey;
    }



    /**
     * Complete a prompt with the model
     * Implements the abstract method from BaseModelProvider
     */
    public async complete(
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse> {
        const taskId = new Date().toISOString();
        if (this.debug) {
            console.log(`[OPENAI][${taskId}] Completing prompt with model ${this.modelConfig.id}`);
        }

        const handlerConfig: HandlerConfig = {
            retries: 0,
            maxRetries: options.maxRetries ?? 4,
            error: null,
            options: options,
        };

        const completeTask: RunnableTask = async (opts) => {
            if (this.debug) {
                console.log(`[OPENAI][${taskId}] Running task with model ${this.modelConfig.id}`);
            }
            const optionsWithDefaults = this.applyDefaultOptions(opts);
            const response = generateText({
                model: openai(this.modelConfig.id),
                prompt: optionsWithDefaults.prompt,
                temperature: optionsWithDefaults.temperature ?? 0.2,
                maxRetries: 0 // We'll handle retries ourselves
            });
            if (this.debug) {
                console.log(`[OPENAI][${taskId}] Task completed with model ${this.modelConfig.id}`);
            }
            return this.wrapResponse(await response);
        };

        // Leverage the runTask method to ensure validation and retry logic
        const result = await this.runTask(completeTask, handlerConfig);
        return result;
    }


    /**
     * Generate an image with the model
     */
    public async generateImage(
        options: ImageGenerationOptions
    ): Promise<ImageGenerationResponse> {
        const taskId = new Date().toISOString();
        if (this.debug) {
            console.log(`[OPENAI][${taskId}] Generating image with model ${this.modelConfig.id}`);
        }

        // Validate inputs
        if (options.size && !['256x256', '512x512', '1024x1024'].includes(options.size)) {
            throw new Error('Invalid image size');
        }
        if (!options.prompt || options.prompt.trim().length === 0) {
            throw new Error('Empty prompt is not allowed');
        }

        try {
            // In a real implementation, this would call the OpenAI API
            // For now, we'll simulate a successful response
            const response = await generateImage({
                model: openai.image(this.modelConfig.id),
                prompt: options.prompt
            });

            return {
                images: ["https://example.com/simulated-openai-image.png"],
                modelId: this.modelConfig.id,
                usage: {
                    promptTokens: 100,
                    totalTokens: 100
                }
            };
        } catch (error) {
            console.error(`[OPENAI] Error generating image: ${error}`);
            throw new Error(`Failed to generate image with OpenAI: ${error}`);
        }
    }
}