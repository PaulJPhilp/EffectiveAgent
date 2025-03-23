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
     * Select appropriate generate function based on format
     */
    private async selectGenerateFunction(
        options: ModelCompletionOptions
    ): Promise<ModelCompletionResponse> {
        switch (options.format) {
            case 'json':
                return this.generateObject(options);
            case 'image':
            case 'embedding':
                throw new Error(`Format '${options.format}' is not supported by DeepSeek`);
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
            model: this.deepseekProvider(this.modelConfig.id),
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
                console.error('[DEEPSEEK] Failed to parse JSON response:', result.text);
                console.error('[DEEPSEEK] Parse error:', error instanceof Error ? error.message : 'Unknown error');
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
            model: this.deepseekProvider(this.modelConfig.id),
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
                console.log(`[DEEPSEEK][${taskId}] Starting task with model ${this.modelConfig.id}`);
            }
            const optionsWithDefaults = this.applyDefaultOptions(opts);
            const response = await this.selectGenerateFunction(optionsWithDefaults);
            if (this.debug) {
                console.log(`[DEEPSEEK][${taskId}] Task completed successfully`);
                if (response.usage) {
                    console.log(`[DEEPSEEK][${taskId}] Tokens used: ${response.usage.totalTokens} (prompt: ${response.usage.promptTokens}, completion: ${response.usage.completionTokens})`);
                }
            }
            return response;
        };

        return await this.runTask(completeTask, handlerConfig);
    }
}
