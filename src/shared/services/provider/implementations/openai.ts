// File: src/shared/services-effect/provider/implementations/openai.ts

import { openai } from '@ai-sdk/openai';
import { embed, generateObject as generateAIObject, generateImage, generateText } from 'ai';
import * as Effect from 'effect/Effect';

import { BaseModelProvider } from '../baseModelProvider.js';
import type { ProviderError } from '../errors.js';
import { ProviderImplementationError } from '../errors.js';
import type { GenerateEmbeddingOptions, GenerateEmbeddingResult, GenerateImageOptions, GenerateImageResult, GenerateObjectOptions, GenerateObjectResult, GenerateTextOptions, GenerateTextResult, LLMCompletionResult, ModelCapability, ModelCompletionOptions, ProviderConfig, ProviderErrorType, ProviderId } from '../types.js';

/** OpenAI provider implementation using Vercel AI SDK */
export class OpenAIProvider extends BaseModelProvider {
	public readonly providerId: ProviderId;

	constructor(public config: ProviderConfig) {
		super(config.id as ProviderId, config);
		this.providerId = config.id as ProviderId;

		const apiKey = process.env[config.apiKeyEnvVar ?? 'OPENAI_API_KEY'];
		if (!apiKey) {
			throw new Error(`OpenAI API key is required (env var: ${config.apiKeyEnvVar ?? 'OPENAI_API_KEY'})`);
		}
	}

	/** Basic validation placeholder */
	protected validateCommonArgs(_args: { modelId?: string; }): Effect.Effect<void, ProviderErrorType> {
		return Effect.void;
	}

	/** Checks if the provider supports a given capability */
	public supportsCapability(capability: ModelCapability): Effect.Effect<boolean, ProviderErrorType> {
		switch (capability) {
			case 'text':
			case 'object':
			case 'embedding':
			case 'image':
				return Effect.succeed(true);
			default:
				return Effect.succeed(false);
		}
	}

	/** Generates text using the Vercel AI SDK */
	public generateText(options: GenerateTextOptions): Effect.Effect<GenerateTextResult, ProviderErrorType> {
		const modelId = options.modelId ?? 'gpt-4-turbo-preview';

		return Effect.tryPromise<GenerateTextResult, ProviderError>({
			try: async (signal: AbortSignal) => {
				const { text: resultText, usage, finishReason } = await generateText({
					model: openai(modelId),
					prompt: options.prompt,
					temperature: options.temperature ?? 0.7,
					maxTokens: options.maxTokens,
					abortSignal: signal
				});
				return {
					text: resultText,
					model: modelId,
					tokens: {
						prompt: usage.promptTokens,
						completion: usage.completionTokens,
						total: usage.totalTokens
					},
					finishReason,
					raw: { text: resultText, usage, finishReason }
				};
			},
			catch: (error: unknown) => new ProviderImplementationError({
				message: `OpenAI text generation failed: ${error instanceof Error ? error.message : String(error)}`,
				providerName: this.config.name,
				modelId: modelId,
				cause: error
			})
		});
	}

	/** Generates images using the Vercel AI SDK */
	public generateImage(options: GenerateImageOptions): Effect.Effect<GenerateImageResult, ProviderErrorType> {
		const modelId = options.modelId ?? 'gpt-4-vision-preview';

		return Effect.tryPromise<GenerateImageResult, ProviderError>({
			try: async (signal: AbortSignal) => {
				const { images, usage } = await generateImage({
					model: openai.image(modelId),
					prompt: options.prompt,
					n: options.n ?? 1,
					size: options.size ?? '1024x1024',
					quality: options.quality ?? 'standard',
					style: options.style ?? 'natural',
					abortSignal: signal
				});

				return {
					urls: images.map(img => img.url),
					model: modelId,
					raw: { images, usage }
				};
			},
			catch: (error: unknown) => new ProviderImplementationError({
				message: `OpenAI image generation failed: ${error instanceof Error ? error.message : String(error)}`,
				providerName: this.config.name,
				modelId: modelId,
				cause: error
			})
		});
	}

	/** Generates embeddings using the Vercel AI SDK */
	public generateEmbedding(options: GenerateEmbeddingOptions): Effect.Effect<GenerateEmbeddingResult, ProviderErrorType> {
		const modelId = options.modelId ?? 'text-embedding-ada-002';

		return Effect.tryPromise<GenerateEmbeddingResult, ProviderError>({
			try: async (signal: AbortSignal) => {
				const { embedding, usage } = await embed({
					model: openai.embedding('text-embedding-3-small'),
					value: options.text,
					abortSignal: signal
				});

				return {
					embeddings: embedding,
					model: modelId,
					raw: { embedding, usage }
				};
			},
			catch: (error: unknown) => new ProviderImplementationError({
				message: `OpenAI embedding generation failed: ${error instanceof Error ? error.message : String(error)}`,
				providerName: this.config.name,
				modelId: modelId,
				cause: error
			})
		});
	}

	/** Generates text using OpenAI's API via Vercel AI SDK (matches BaseModelProvider) */
	public complete(prompt: string, options?: ModelCompletionOptions): Effect.Effect<LLMCompletionResult, ProviderError> {
		const modelId = options?.modelId ?? 'gpt-4-turbo-preview';

		return Effect.tryPromise<LLMCompletionResult, ProviderError>({
			try: async (signal: AbortSignal) => {
				const { text: resultText, usage, finishReason } = await generateText({
					model: openai(modelId),
					prompt,
					temperature: options?.temperature ?? 0.7,
					maxTokens: options?.maxTokens,
					abortSignal: signal
				});
				return {
					content: resultText,
					model: modelId,
					tokens: {
						prompt: usage.promptTokens,
						completion: usage.completionTokens,
						total: usage.totalTokens
					},
					finishReason,
					raw: { text: resultText, usage, finishReason }
				};
			},
			catch: (error: unknown) => new ProviderImplementationError({
				message: `OpenAI text generation failed: ${error instanceof Error ? error.message : String(error)}`,
				providerName: this.config.name,
				modelId: modelId,
				cause: error
			})
		});
	}

	/** Generates structured objects using OpenAI's API via Vercel AI SDK */
	public generateObject<T>(options: GenerateObjectOptions<T>): Effect.Effect<GenerateObjectResult<T>, ProviderError> {
		const modelId = options.modelId ?? 'gpt-4-turbo-preview';

		return Effect.tryPromise<GenerateObjectResult<T>, ProviderError>({
			try: async (signal: AbortSignal) => {
				const { object, usage } = await generateAIObject<T>({
					model: openai(modelId),
					schema: options.schema,
					prompt: options.prompt,
					temperature: options.temperature ?? 0.7,
					maxTokens: options.maxTokens,
					mode: 'json',
					abortSignal: signal
				});
				return {
					object,
					model: modelId,
					tokens: {
						prompt: usage.promptTokens,
						completion: usage.completionTokens,
						total: usage.totalTokens
					},
					raw: { object, usage }
				};
			},
			catch: (error: unknown) => new ProviderImplementationError({
				message: `OpenAI object generation failed: ${error instanceof Error ? error.message : String(error)}`,
				providerName: this.config.name,
				modelId: modelId,
				cause: error
			})
		});
	}
}
