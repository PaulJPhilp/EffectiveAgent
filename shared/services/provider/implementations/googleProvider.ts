import { generateText, APICallError } from "ai";
import type { ModelConfig } from "../../model/schemas/modelConfig.js";
import type {
    HandlerConfig,
    ImageGenerationOptions, ImageGenerationResponse,
    ModelCompletionOptions, ModelCompletionResponse,
    RunnableTask
} from "../modelProvider.js";
import { BaseModelProvider } from "../modelProvider.js";
import { google, createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Provider implementation for Google models (Gemini)
 */
export class GoogleProvider extends BaseModelProvider {
    private apiKey: string;
    private googleProvider: ReturnType<typeof createGoogleGenerativeAI>;

    /**
     * Creates a new GoogleProvider instance
     * @param modelConfig - Configuration for the model
     */
    constructor(modelConfig: ModelConfig) {
        super(modelConfig);
        
        // Get API key from environment variables
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        
        if (!apiKey) {
            throw new Error(
                'GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set'
            );
        }
        
        this.apiKey = apiKey;
        
        // Initialize the Google provider with API key
        this.googleProvider = createGoogleGenerativeAI({
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
                model: google(this.modelConfig.id),
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
            console.log(`[GOOGLE][${taskId}] Generating image with model ${this.modelConfig.id}`);
        }

        try {
            // In a real implementation, this would call the Google API
            // For now, we'll simulate a successful response
            return {
                images: ["https://example.com/simulated-google-image.png"],
                modelId: this.modelConfig.id,
                usage: {
                    promptTokens: 50,
                    totalTokens: 50
                }
            };
        } catch (error) {
            if (this.debug) {
                console.error(`[GOOGLE][${taskId}] Error generating image: ${error}`);
            }
            throw new Error(`Failed to generate image with Google: ${error}`);
        }
    }
}
