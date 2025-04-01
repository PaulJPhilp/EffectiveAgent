// File: src/shared/services-effect/provider/implementations/google.ts

import { google } from '@ai-sdk/google';
import { embed, generateImage, generateText } from 'ai';
import * as Effect from 'effect/Effect';

import { BaseModelProvider } from '../baseModelProvider.js';
import type { ProviderError } from '../errors.js';
import { ProviderCapabilityUnavailableError, ProviderImplementationError } from '../errors.js';
import type { GenerateEmbeddingOptions, GenerateEmbeddingResult, GenerateImageOptions, GenerateImageResult, GenerateObjectOptions, GenerateObjectResult, GenerateTextOptions, GenerateTextResult, LLMCompletionResult, ModelCapability, ModelCompletionOptions, ProviderConfig, ProviderErrorType, ProviderId } from '../types.js';

/** Google provider implementation using Vercel AI SDK */
export class GoogleProvider extends BaseModelProvider {
	public readonly providerId: ProviderId;

	constructor(public config: ProviderConfig) {
		super(config.id as ProviderId, config);
		this.providerId = config.id as ProviderId;

		const apiKey = process.env[config.apiKeyEnvVar ?? 'GOOGLE_API_KEY'];
		if (!apiKey) {
			throw new Error(`Google API key is required (env var: ${config.apiKeyEnvVar ?? 'GOOGLE_API_KEY'})`);
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
			case 'embedding':
			case 'image':
				return Effect.succeed(true);
			case 'object':
				return Effect.succeed(false);
			default:
				return Effect.succeed(false);
		}
	}

	/** Generates text using the Vercel AI SDK */
	public generateText(options: GenerateTextOptions): Effect.Effect<GenerateTextResult, ProviderErrorType> {
		const modelId = options.modelId ?? 'gemini-pro';

		return Effect.tryPromise<GenerateTextResult, ProviderError>({
			try: async (signal: AbortSignal) => {
				const { text: resultText, usage } = await generateText({
					model: google(modelId),
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
					raw: { text: resultText, usage }
				};
			},
			catch: (error: unknown) => new ProviderImplementationError({
				message: `Google text generation failed: ${error instanceof Error ? error.message : String(error)}`,
				providerName: this.config.name,
				modelId: modelId,
				cause: error
			})
		});
	}

	/** Generates text using Google's API via Vercel AI SDK (matches BaseModelProvider) */
	public complete(prompt: string, options?: ModelCompletionOptions): Effect.Effect<LLMCompletionResult, ProviderError> {
		const modelId = options?.modelId ?? 'gemini-pro';

		return Effect.tryPromise<LLMCompletionResult, ProviderError>({
			try: async (signal: AbortSignal) => {
				const { text: resultText, usage, finishReason } = await generateText({
					model: google(modelId),
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
				message: `Google text generation failed: ${error instanceof Error ? error.message : String(error)}`,
				providerName: this.config.name,
				modelId: modelId,
				cause: error
			})
		});
	}

	/** Generates embeddings using the Vercel AI SDK */
	public generateEmbedding(options: GenerateEmbeddingOptions): Effect.Effect<GenerateEmbeddingResult, ProviderErrorType> {
		const modelId = options.modelId ?? 'embedding-001';

		return Effect.tryPromise<GenerateEmbeddingResult, ProviderError>({
			try: async (signal: AbortSignal) => {
				const { embedding, usage } = await embed({
					model: google.embedding(modelId),
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
				message: `Google embedding generation failed: ${error instanceof Error ? error.message : String(error)}`,
				providerName: this.config.name,
				modelId: modelId,
				cause: error
			})
		});
	}

	/** Generates images using the Vercel AI SDK */
	public generateImage(options: GenerateImageOptions): Effect.Effect<GenerateImageResult, ProviderErrorType> {
		const modelId = options.modelId ?? 'gemini-pro-vision';

		return Effect.tryPromise<GenerateImageResult, ProviderError>({
			try: async (signal: AbortSignal) => {
				const { images, usage } = await generateImage({
					model: google.image(modelId),
					prompt: options.prompt,
					n: options.n ?? 1,
					size: options.size ?? '1024x1024',
					abortSignal: signal
				});

				return {
					urls: images.map(img => img.url),
					model: modelId,
					raw: { images, usage }
				};
			},
			catch: (error: unknown) => new ProviderImplementationError({
				message: `Google image generation failed: ${error instanceof Error ? error.message : String(error)}`,
				providerName: this.config.name,
				modelId: modelId,
				cause: error
			})
		});
	}

	/** Generates structured objects using the Vercel AI SDK */
	public generateObject<T>(_options: GenerateObjectOptions<T>): Effect.Effect<GenerateObjectResult<T>, ProviderError> {
		return Effect.fail(new ProviderCapabilityUnavailableError({ providerName: this.providerId, capability: 'object' }));
	}
}
