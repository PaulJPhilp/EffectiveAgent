import { generateText } from "ai";
import type { ModelConfig } from "../../model/schemas/modelConfig.js";
import type {
    EmbeddingOptions,
    EmbeddingResponse,
    HandlerConfig,
    ImageGenerationOptions, ImageGenerationResponse,
    ModelCompletionOptions, ModelCompletionResponse,
    RunnableTask
} from "../modelProvider.js";
import { BaseModelProvider } from "../modelProvider.js";
import { anthropic, createAnthropic } from "@ai-sdk/anthropic";

/**
 * Provider implementation for Anthropic models
 */
export class AnthropicProvider extends BaseModelProvider {
    private apiKey: string;
    private anthropicProvider: ReturnType<typeof createAnthropic>;

    /**
     * Creates a new AnthropicProvider instance
     * @param modelConfig - Configuration for the model
     */
    constructor(modelConfig: ModelConfig) {
        super(modelConfig);
        this.debug = true;

        // Get API key from environment variables
        const apiKey = process.env.ANTHROPIC_API_KEY;
        
        if (!apiKey) {
            throw new Error(
                'ANTHROPIC_API_KEY environment variable is not set'
            );
        }
        
        this.apiKey = apiKey;
        
        // Initialize the Anthropic provider with API key
        this.anthropicProvider = createAnthropic({
            apiKey: this.apiKey
        });
    }

    /**
         * Complete a prompt with the model
         * Implements the abstract method from BaseModelProvider
         */
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
                throw new Error('Image generation not supported by Anthropic models');
            case 'embedding':
                throw new Error('Embedding generation not supported by Anthropic models');
            case 'text':
            default:
                return this.generateText(options);
        }
    }

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
                console.log(`[ANTHROPIC][${taskId}] Starting task with model ${this.modelConfig.id}`);
            }
            const optionsWithDefaults = this.applyDefaultOptions(opts);
            const response = await this.selectGenerateFunction(optionsWithDefaults);
            if (this.debug) {
                console.log(`[ANTHROPIC][${taskId}] Task completed successfully`);
                if (response.usage) {
                    console.log(`[ANTHROPIC][${taskId}] Tokens used: ${response.usage.totalTokens} (prompt: ${response.usage.promptTokens}, completion: ${response.usage.completionTokens})`);
                }
            }
            return response;
        };

        return await this.runTask(completeTask, handlerConfig);
    }

    /**
     * Generate an image with the given model
     */
    public async generateImage(
        options: ImageGenerationOptions
    ): Promise<ImageGenerationResponse> {
        // Anthropic doesn't support image generation yet, so throw an error
        throw new Error("Image generation not supported by Anthropic models");
    }

    /**
     * Generate structured data in JSON format
     */
    public async generateObject(
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse> {
        // Enhance prompt to ensure valid JSON response
        const jsonPrompt = `${options.prompt}\n\nIMPORTANT: You must respond with ONLY a valid JSON object. Format your entire response as a single JSON object with proper syntax, including all closing braces. Do not include any other text, markdown formatting, or explanation.`;
        
        const response = await generateText({
            model: anthropic(this.modelConfig.id),
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
                console.error('[ANTHROPIC] Failed to parse JSON response:', result.text);
                console.error('[ANTHROPIC] Parse error:', error instanceof Error ? error.message : 'Unknown error');
            }
            throw new Error(`Failed to parse response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        return result;
    }

    public async generateEmbedding(
        options: EmbeddingOptions
    ): Promise<EmbeddingResponse> {
        throw new Error('Embedding generation not supported by Anthropic models');
    }

    /**
* Generate an object with the given model
*/
    public async generateText(
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse> {
        return generateText({
            model: anthropic(this.modelConfig.id),
            prompt: options.prompt,
            temperature: options.temperature ?? 0.2,
            maxRetries: 0 // We handle retries ourselves
        }).then(response => this.wrapResponse(response));
    }
}
