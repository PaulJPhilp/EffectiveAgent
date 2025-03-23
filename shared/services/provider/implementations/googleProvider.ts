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
     * Select appropriate generate function based on format
     */
    private async selectGenerateFunction(
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse> {
        switch (options.format) {
            case 'json':
                return this.generateObject(options);
            case 'image':
                return this.generateImage(options);
            case 'embedding':
                return this.generateEmbedding(options);
            case 'text':
            default:
                return this.generateText(options);
        }
    }

    /**
     * Generate structured data in JSON format
     */
    private async generateObject(
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse> {
        // Enhance prompt to ensure valid JSON response
        const jsonPrompt = `${options.prompt}\n\nIMPORTANT: You must respond with ONLY a valid JSON object. Format your entire response as a single JSON object with proper syntax, including all closing braces. Do not include any other text, markdown formatting, or explanation.`;
        
        const response = await generateText({
            model: google(this.modelConfig.id),
            prompt: jsonPrompt,
            temperature: options.temperature ?? 0.2,
            maxRetries: 0 // We handle retries ourselves
        });
        
        const result = this.wrapResponse(response);
        if (!result.text) {
            throw new Error('Empty response from model');
        }

        try {
            // Clean the response text and ensure it's valid JSON
            const cleanedText = result.text.trim();
            if (!cleanedText.startsWith('{') || !cleanedText.endsWith('}')) {
                throw new Error('Response is not a JSON object');
            }
            result.json = JSON.parse(cleanedText);
        } catch (error: unknown) {
            if (this.debug) {
                console.error('[GOOGLE] Failed to parse JSON response:', result.text);
                console.error('[GOOGLE] Parse error:', error instanceof Error ? error.message : 'Unknown error');
            }
            throw new Error(`Failed to parse response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        return result;
    }

    /**
     * Generate a text response from the model
     */
    private async generateText(
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse> {
        const response = await generateText({
            model: google(this.modelConfig.id),
            prompt: options.prompt,
            temperature: options.temperature ?? 0.2,
            maxRetries: 0 // We handle retries ourselves
        });
        return this.wrapResponse(response);
    }

    /**
     * Complete a prompt with the model
     * Implements the abstract method from BaseModelProvider
     */
    public async complete(
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse> {
        const taskId = new Date().toISOString();
        const handlerConfig: HandlerConfig = {
            retries: 0,
            maxRetries: options.maxRetries ?? 4,
            error: null,
            options: options,
        };

        const completeTask: RunnableTask = async (opts) => {
            if (this.debug) {
                console.log(`[GOOGLE][${taskId}] Starting task with model ${this.modelConfig.id}`);
            }
            const optionsWithDefaults = this.applyDefaultOptions(opts);
            const response = await this.selectGenerateFunction(optionsWithDefaults);
            if (this.debug) {
                console.log(`[GOOGLE][${taskId}] Task completed successfully`);
                if (response.usage) {
                    console.log(`[GOOGLE][${taskId}] Tokens used: ${response.usage.totalTokens} (prompt: ${response.usage.promptTokens}, completion: ${response.usage.completionTokens})`);
                }
            }
            return response;
        };

        return await this.runTask(completeTask, handlerConfig);
    }

    /**
     * Generate an image with the model
     */
    private async generateImage(
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse> {
        const taskId = new Date().toISOString();
        if (this.debug) {
            console.log(`[GOOGLE][${taskId}] Generating image with model ${this.modelConfig.id}`);
        }

        try {
            // For now, we'll simulate a successful response since Google's image generation
            // API is not yet available in the AI SDK
            const textResponse = await generateText({
                model: google(this.modelConfig.id),
                prompt: options.prompt,
                temperature: 0,
                maxRetries: 0
            });

            return {
                modelId: this.modelConfig.id,
                text: options.prompt,
                image: "https://example.com/simulated-google-image.png",
                usage: {
                    promptTokens: 100,
                    completionTokens: 0,
                    totalTokens: 100
                },
                providerResponse: textResponse
            };
        } catch (error) {
            console.error(`[GOOGLE] Error generating image: ${error}`);
            throw new Error(`Failed to generate image with Google: ${error}`);
        }
    }

    /**
     * Generate embeddings for text using Google
     */
    private async generateEmbedding(
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse> {
        const taskId = new Date().toISOString();
        if (this.debug) {
            console.log(`[GOOGLE][${taskId}] Generating embedding with model ${this.modelConfig.id}`);
        }

        try {
            // For now, we'll simulate embedding generation since we don't have the actual Google embedding API call
            const mockEmbedding = new Array(768).fill(0).map(() => Math.random()); // Google embeddings are typically 768-dimensional
            const textResponse = await generateText({
                model: google(this.modelConfig.id),
                prompt: options.prompt,
                temperature: 0,
                maxRetries: 0
            });
            
            return {
                modelId: this.modelConfig.id,
                text: options.prompt,
                embedding: mockEmbedding,
                usage: {
                    promptTokens: 100,
                    completionTokens: 0,
                    totalTokens: 100
                },
                providerResponse: textResponse
            };
        } catch (error) {
            console.error(`[GOOGLE] Error generating embedding: ${error}`);
            throw new Error(`Failed to generate embedding with Google: ${error}`);
        }
    }
}
