import { openai } from "@ai-sdk/openai";
import type { LanguageModelRequestMetadata } from "ai";
import { generateText } from "ai";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { ModelConfig } from "../../model/schemas/modelConfig.js";
import type {
    EmbeddingOptions, EmbeddingResponse,
    ImageGenerationOptions, ImageGenerationResponse,
    ModelCompletionOptions, ModelCompletionResponse,
    ModelProvider
} from "../modelProvider.js";
import { BaseModelProvider } from "../modelProvider.js";

type CoreMessage = ChatCompletionMessageParam & {
    role: "system" | "user" | "assistant";
    content: string;
    id: string;
};

/** 
 * OpenAI provider implementation for model interactions
 * @extends BaseModelProvider
 * @implements ModelProvider
 */
export class OpenAIProvider extends BaseModelProvider implements ModelProvider {
    private client: OpenAI;

    /**
     * Creates a new OpenAIProvider instance
     * @param modelConfig - Model configuration
     */
    constructor(modelConfig: ModelConfig) {
        super(modelConfig);
        const apiKey = process.env["OPENAI_API_KEY"];    
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not set');
        }
        this.client = new OpenAI({ apiKey });
    }

    public async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResponse> {
        try {
            const response = await this.client.images.generate({
                model: this.modelConfig.modelName,
                prompt: options.prompt,
                n: options.numberOfImages || 1,
                quality: options.quality as "standard" | "hd" || "standard",
                style: options.style as "natural" | "vivid" || "natural",
                response_format: "url"
            });

            return {
                images: response.data.map(img => img.url || ''),
                usage: {
                    promptTokens: 0,
                    totalTokens: 0
                }
            };
        } catch (error) {
            console.error('Error generating image:', error);
            throw error;
        }
    }

    /**
     * Get the model configuration
     * @returns The model configuration
     */
    public override getModelConfig(): ModelConfig {
        return this.modelConfig;
    }

    /**
     * Complete a model request with the given options
     * @param options - Options for the completion request
     * @returns A promise resolving to the model completion response
     */
    public override async complete(options: ModelCompletionOptions): Promise<ModelCompletionResponse> {
        const finalOptions = this.applyDefaultOptions(options);

        switch (finalOptions.format) {
            case 'image': {
                const imageResponse = await this.generateImage({
                    prompt: finalOptions.prompt,
                    numberOfImages: 1
                });
                const now = new Date();
                return {
                    modelId: this.modelConfig.modelName,
                    text: finalOptions.prompt,
                    image: imageResponse.images[0],
                    usage: {
                        promptTokens: 0,
                        completionTokens: 0,
                        totalTokens: 0
                    },
                    providerResponse: {
                        text: finalOptions.prompt,
                        reasoning: "Image generation",
                        files: [],
                        reasoningDetails: [],
                        response: {
                            id: generateUniqueId(),
                            timestamp: now,
                            modelId: this.modelConfig.modelName,
                            messages: [],
                            body: imageResponse
                        },
                        sources: [],
                        experimental_output: null,
                        toolCalls: [],
                        toolResults: [],
                        finishReason: "stop",
                        usage: {
                            promptTokens: 0,
                            completionTokens: 0,
                            totalTokens: 0
                        },
                        warnings: [],
                        steps: [],
                        logprobs: undefined,
                        providerMetadata: {},
                        experimental_providerMetadata: undefined,
                        request: {
                            model: this.modelConfig.modelName,
                            prompt: finalOptions.prompt,
                            temperature: finalOptions.temperature,
                            maxTokens: finalOptions.maxTokens
                        } as LanguageModelRequestMetadata,
                    }
                };
            }
            case 'embedding': {
                const embeddingResponse = await this.generateEmbedding({
                    input: finalOptions.prompt
                });
                const now = new Date();
                return {
                    modelId: this.modelConfig.modelName,
                    text: finalOptions.prompt,
                    embedding: embeddingResponse.embeddings[0],
                    usage: {
                        promptTokens: 0,
                        completionTokens: 0,
                        totalTokens: 0
                    },
                    providerResponse: {
                        text: finalOptions.prompt,
                        reasoning: "Embedding generation",
                        files: [],
                        reasoningDetails: [],
                        response: {
                            id: generateUniqueId(),
                            timestamp: now,
                            modelId: this.modelConfig.modelName,
                            messages: [],
                            body: embeddingResponse
                        },
                        sources: [],
                        experimental_output: null,
                        toolCalls: [],
                        toolResults: [],
                        finishReason: "stop",
                        usage: {
                            promptTokens: 0,
                            completionTokens: 0,
                            totalTokens: 0
                        },
                        warnings: [],
                        steps: [],
                        logprobs: undefined,
                        providerMetadata: {},
                        experimental_providerMetadata: undefined,
                        request: {
                            model: this.modelConfig.modelName,
                            prompt: finalOptions.prompt,
                            temperature: finalOptions.temperature,
                            maxTokens: finalOptions.maxTokens
                        } as LanguageModelRequestMetadata,
                    }
                };
            }
            default: {
                const response = await this.client.chat.completions.create({
                    model: this.modelConfig.modelName,
                    messages: [
                        ...(finalOptions.systemPrompt ? [{ role: 'system' as const, content: finalOptions.systemPrompt }] : []),
                        { role: 'user' as const, content: finalOptions.prompt }
                    ],
                    temperature: finalOptions.temperature,
                    max_tokens: finalOptions.maxTokens,
                    ...(finalOptions.functions ? { functions: finalOptions.functions } : {}),
                    ...(finalOptions.functionCall ? { function_call: typeof finalOptions.functionCall === 'string' ? finalOptions.functionCall as "none" | "auto" : { name: finalOptions.functionCall.name } } : {}),
                    ...(finalOptions.stopSequences ? { stop: finalOptions.stopSequences } : {})
                });

                return {
                    modelId: this.modelConfig.modelName,
                    text: response.choices[0].message.content || '',
                    usage: {
                        promptTokens: response.usage?.prompt_tokens || 0,
                        completionTokens: response.usage?.completion_tokens || 0,
                        totalTokens: response.usage?.total_tokens || 0
                    },
                    functionCalls: response.choices[0].message.function_call ? [{
                        name: response.choices[0].message.function_call.name,
                        arguments: JSON.parse(response.choices[0].message.function_call.arguments)
                    }] : undefined,
                    providerResponse: {
                        text: response.choices[0].message.content || '',
                        reasoning: "Chat completion",
                        files: [],
                        reasoningDetails: [],
                        response: {
                            id: response.id,
                            timestamp: new Date(response.created * 1000),
                            modelId: this.modelConfig.modelName,
                            messages: response.choices.map(choice => ({
                                id: generateUniqueId(),
                                role: "assistant" as const,
                                content: choice.message.content || '',
                                functionCall: choice.message.function_call ? {
                                    name: choice.message.function_call.name,
                                    arguments: choice.message.function_call.arguments
                                } : undefined
                            })),
                            body: response
                        },
                        sources: [],
                        experimental_output: null,
                        toolCalls: [],
                        toolResults: [],
                        finishReason: response.choices[0].finish_reason === "function_call" ? "tool-calls" : response.choices[0].finish_reason === "content_filter" ? "content-filter" : response.choices[0].finish_reason as "stop" | "length",
                        usage: {
                            promptTokens: response.usage?.prompt_tokens || 0,
                            completionTokens: response.usage?.completion_tokens || 0,
                            totalTokens: response.usage?.total_tokens || 0
                        },
                        warnings: [],
                        steps: [],
                        logprobs: undefined,
                        providerMetadata: {},
                        experimental_providerMetadata: undefined,
                        request: {
                            model: this.modelConfig.modelName,
                            prompt: finalOptions.prompt,
                            temperature: finalOptions.temperature,
                            maxTokens: finalOptions.maxTokens
                        } as LanguageModelRequestMetadata,
                    }
                };
            }
        }
    }

    /**
     * Generate structured data in JSON format
     */
    public async generateObject(options: ModelCompletionOptions): Promise<ModelCompletionResponse> {
        // Enhance prompt to ensure valid JSON response
        const jsonPrompt = `${options.prompt}\n\nIMPORTANT: You must respond with ONLY a valid JSON object. Format your entire response as a single JSON object with proper syntax, including all closing braces. Do not include any other text, markdown formatting, or explanation.`;

        const messages: CoreMessage[] = [];
        if (options.systemPrompt) {
            messages.push({
                id: generateUniqueId(),
                role: "system",
                content: options.systemPrompt
            });
        }
        messages.push({
            id: generateUniqueId(),
            role: "user",
            content: jsonPrompt
        });

        const response = await generateText({
            model: openai(this.modelConfig.modelName),
            messages,
            temperature: options.temperature ?? 0.2,
            maxTokens: options.maxTokens,
            maxRetries: 0 // We handle retries ourselves
        });

        const result = this.wrapResponse(response);
        if (!result.text) {
            throw new Error('Empty response from model');
        }

        try {
            const cleanedText = result.text.trim();
            if (!cleanedText.startsWith('{') || !cleanedText.endsWith('}')) {
                throw new Error('Response is not a JSON object');
            }
            result.json = JSON.parse(cleanedText);
        } catch (error: unknown) {
            if (this.debug) {
                console.error('[OPENAI] Failed to parse JSON response:', result.text);
                console.error('[OPENAI] Parse error:', error instanceof Error ? error.message : 'Unknown error');
            }
            throw new Error(`Failed to parse response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        return result;
    }


    /**
     * Generate embeddings for the given input
     * @param options - Options for the embedding request
     * @returns A promise resolving to the embedding response
     */
    public async generateEmbedding(options: EmbeddingOptions): Promise<EmbeddingResponse> {
        try {
            const response = await this.client.embeddings.create({
                model: this.modelConfig.modelName,
                input: options.input
            });

            return {
                embeddings: response.data.map(embedding => embedding.embedding),
                usage: {
                    promptTokens: 0,
                    totalTokens: 0
                }
            };
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }
}

// Assuming a function to generate unique IDs
function generateUniqueId(): string {
    return Date.now().toString();
}
