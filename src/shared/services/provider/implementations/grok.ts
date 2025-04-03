// File: src/shared/services-effect/provider/implementations/grok.ts

import * as Effect from 'effect/Effect';
import { xai } from '@ai-sdk/xai';
import { generateText } from 'ai';

import { 
  ProviderConfig, 
  ModelCompletionOptions, 
  GenerateObjectOptions, 
  GenerateObjectResult, 
  LLMCompletionResult, 
  GenerateEmbeddingOptions, 
  GenerateEmbeddingResult, 
  GenerateImageOptions, 
  GenerateImageResult, 
  GenerateTextOptions, 
  GenerateTextResult, 
  ModelCapability, 
  ProviderErrorType, 
  ProviderId, 
  ValidateEffect, 
  CompletionEffect, 
  TextGenerationEffect, 
  ImageGenerationEffect, 
  EmbeddingGenerationEffect, 
  ObjectGenerationEffect 
} from '@service/provider/types.js';
import { ProviderImplementationError, ProviderCapabilityUnavailableError } from '@service/provider/errors.js';
import { BaseModelProvider } from '@service/provider/baseModelProvider.js';
import { createProviderId } from '@service/provider/utils.js';

/**
 * Interface for xAI SDK response
 */
interface XAiResponse {
    text: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

/** xAI Grok provider implementation using Vercel AI SDK */
export class GrokProvider extends BaseModelProvider {
    private readonly apiKey: string;

    constructor(public config: ProviderConfig) {
        super(config.name, config);

        const apiKey = process.env[config.apiKeyEnvVar ?? 'XAI_API_KEY'];
        if (!apiKey) {
            throw new Error(`xAI API key is required (env var: ${config.apiKeyEnvVar ?? 'XAI_API_KEY'})`);
        }
        this.apiKey = apiKey;

        // Configure xAI SDK
        process.env['XAI_API_KEY'] = apiKey;
    }

    /** Basic validation placeholder */
    protected validateCommonArgs(_args: { modelId?: string; }): Effect.Effect<void, ProviderErrorType> {
        return Effect.void;
    }

    /** Checks if the provider supports a given capability */
    public supportsCapability(capability: ModelCapability): Effect.Effect<boolean, never> {
        switch (capability) {
            case ModelCapability.TEXT_GENERATION:
                return Effect.succeed(true);
            case ModelCapability.EMBEDDINGS:
            case ModelCapability.IMAGE_GENERATION:
            case ModelCapability.OBJECT_GENERATION:
                return Effect.succeed(false);
            default:
                return Effect.succeed(false);
        }
    }

    /** Generates text using the Vercel AI SDK */
    public generateText(options: GenerateTextOptions): TextGenerationEffect {
        const modelId = options.modelId ?? 'grok-1';

        return Effect.tryPromise({
            try: async (signal: AbortSignal) => {
                const apiResult = await generateText({
                    model: xai(modelId),
                    prompt: options.prompt,
                    temperature: options.temperature ?? 0.7,
                    maxTokens: options.maxTokens,
                    abortSignal: signal
                }) as XAiResponse | string;

                if (apiResult === null || apiResult === undefined) {
                    throw new ProviderImplementationError({
                        message: 'No response from xAI API',
                        providerName: this.config.name,
                        modelId: modelId,
                        cause: new Error('No response from xAI API')
                    });
                }

                // Handle string response
                if (typeof apiResult === 'string') {
                    return {
                        text: apiResult,
                        model: modelId,
                        raw: {
                            text: apiResult,
                            usage: {
                                promptTokens: 0,
                                completionTokens: apiResult.length / 4,
                                totalTokens: apiResult.length / 4
                            }
                        }
                    };
                }

                // Handle object response
                if ('text' in apiResult) {
                    return {
                        text: apiResult.text,
                        model: modelId,
                        raw: {
                            text: apiResult.text,
                            usage: {
                                promptTokens: apiResult.usage?.promptTokens ?? 0,
                                completionTokens: apiResult.usage?.completionTokens ?? 0,
                                totalTokens: apiResult.usage?.totalTokens ?? 0
                            }
                        }
                    };
                }

                throw new ProviderImplementationError({
                    message: 'Invalid response format from xAI API',
                    providerName: this.config.name,
                    modelId: modelId,
                    cause: new Error('Invalid response format from xAI API')
                });
            },
            catch: (error: unknown) => {
                return Effect.fail(new ProviderImplementationError({
                    message: `xAI text generation failed: ${error instanceof Error ? error.message : String(error)}`,
                    providerName: this.config.name,
                    modelId: modelId,
                    cause: error
                }));
            }
        });
    }

    /** Generates text using xAI's API via Vercel AI SDK (matches BaseModelProvider) */
    public complete(prompt: string, options?: ModelCompletionOptions): CompletionEffect {
        const modelId = options?.modelId ?? 'grok-1';

        return Effect.tryPromise<LLMCompletionResult, ProviderErrorType>({
            try: async (signal: AbortSignal) => {
                const apiResult = await generateText({
                    model: xai(modelId),
                    prompt: prompt,
                    temperature: options?.temperature ?? 0.7,
                    maxTokens: options?.maxTokens,
                    abortSignal: signal
                });

                if (apiResult === null || apiResult === undefined) {
                    return Effect.fail(new ProviderImplementationError({
                        message: 'No response from xAI API',
                        providerName: this.config.name,
                        modelId: modelId,
                        cause: new Error('No response from xAI API')
                    }));
                }

                // The xAI SDK returns a response object with a 'text' property
                if (typeof apiResult === 'string') {
                    return {
                        content: apiResult,
                        model: modelId,
                        tokens: {
                            prompt: 0,
                            completion: (apiResult as string).length / 4, // Approximate token count
                            total: (apiResult as string).length / 4
                        },
                        finishReason: 'stop',
                        raw: {
                            text: apiResult,
                            usage: {
                                promptTokens: 0,
                                completionTokens: (apiResult as string).length / 4,
                                totalTokens: (apiResult as string).length / 4
                            }
                        }
                    };
                }

                if (apiResult.text) {
                    return {
                        content: apiResult.text,
                        model: modelId,
                        tokens: {
                            prompt: apiResult.usage?.promptTokens ?? 0,
                            completion: apiResult.usage?.completionTokens ?? 0,
                            total: apiResult.usage?.totalTokens ?? 0
                        },
                        finishReason: 'stop',
                        raw: {
                            text: apiResult.text,
                            usage: {
                                promptTokens: apiResult.usage?.promptTokens ?? 0,
                                completionTokens: apiResult.usage?.completionTokens ?? 0,
                                totalTokens: apiResult.usage?.totalTokens ?? 0
                            }
                        }
                    };
                }

                return Effect.fail(new ProviderImplementationError({
                    message: 'Invalid response format from xAI API',
                    providerName: this.config.name,
                    modelId: modelId,
                    cause: new Error('Invalid response format from xAI API')
                }));
            },
            catch: (error: unknown) => {
                return Effect.fail(new ProviderImplementationError({
                    message: `xAI text generation failed: ${error instanceof Error ? error.message : String(error)}`,
                    providerName: this.config.name,
                    modelId: modelId,
                    cause: error
                }));
            }
        });
    }

    /** Generates embeddings using the Vercel AI SDK */
    public generateEmbedding(_options: GenerateEmbeddingOptions): EmbeddingGenerationEffect {
        return Effect.fail(new ProviderCapabilityUnavailableError({ providerName: this.config.name, capability: 'embeddings' }));
    }

    /** Generates images using the Vercel AI SDK */
    public generateImage(_options: GenerateImageOptions): ImageGenerationEffect {
        return Effect.fail(new ProviderCapabilityUnavailableError({ providerName: this.config.name, capability: 'image-generation' }));
    }

    /** Generates structured objects using the Vercel AI SDK */
    public generateObject<T>(_options: GenerateObjectOptions<T>): ObjectGenerationEffect<T> {
        return Effect.fail(new ProviderCapabilityUnavailableError({ providerName: this.config.name, capability: 'object-generation' }));
    }
}
