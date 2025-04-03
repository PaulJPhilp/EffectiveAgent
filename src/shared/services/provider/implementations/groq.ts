// File: src/shared/services-effect/provider/implementations/groq.ts

import * as Effect from 'effect/Effect';
import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';

import type { ProviderConfig, ModelCompletionOptions, GenerateObjectOptions, GenerateObjectResult, LLMCompletionResult, GenerateEmbeddingOptions, GenerateEmbeddingResult, GenerateImageOptions, GenerateImageResult, GenerateTextOptions, GenerateTextResult, ModelCapability, ProviderErrorType, ProviderId, ValidateEffect, CompletionEffect, TextGenerationEffect, ImageGenerationEffect, EmbeddingGenerationEffect, ObjectGenerationEffect } from '@service/provider/types.js';
import { ProviderImplementationError, ProviderCapabilityUnavailableError } from '@service/provider/errors.js';
import type { ProviderError } from '@service/provider/errors.js';
import { BaseModelProvider } from '@service/provider/baseModelProvider.js';
import { createProviderId } from '@service/provider/utils.js';

/** Groq provider implementation using Vercel AI SDK */
export class GroqProvider extends BaseModelProvider {
	public readonly providerId: ProviderId;

	constructor(public config: ProviderConfig) {
		super(config.name, config);
		this.providerId = createProviderId(config.name);

		const apiKey = process.env[config.apiKeyEnvVar ?? 'GROQ_API_KEY'];
		if (!apiKey) {
			throw new Error(`Groq API key is required (env var: ${config.apiKeyEnvVar ?? 'GROQ_API_KEY'})`);
		}
	}

	/** Basic validation placeholder */
	protected validateCommonArgs(_args: { modelId?: string; }): Effect.Effect<void, ProviderErrorType> {
		return Effect.void;
	}

	/** Checks if the provider supports a given capability */
	public supportsCapability(capability: ModelCapability): Effect.Effect<boolean, never> {
		switch (capability) {
			case 'text-generation':
				return Effect.succeed(true);
			case 'embeddings':
			case 'image-generation':
			case 'object-generation':
				return Effect.succeed(false);
			default:
				return Effect.succeed(false);
		}
	}

	/** Generates text using the Vercel AI SDK */
	public generateText(options: GenerateTextOptions): TextGenerationEffect {
		const modelId = options.modelId ?? 'mixtral-8x7b-32768';

		return Effect.tryPromise<GenerateTextResult, ProviderError>({
			try: async (signal: AbortSignal) => {
				const { text: resultText, usage } = await generateText({
					model: groq(modelId),
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
				message: `Groq text generation failed: ${error instanceof Error ? error.message : String(error)}`,
				providerName: this.config.name,
				modelId: modelId,
				cause: error
			})
		});
	}

	/** Generates text using Groq's API via Vercel AI SDK (matches BaseModelProvider) */
	public complete(prompt: string, options?: ModelCompletionOptions): CompletionEffect {
		const modelId = options?.modelId ?? 'mixtral-8x7b-32768';

		return Effect.tryPromise<LLMCompletionResult, ProviderError>({
			try: async (signal: AbortSignal) => {
				const { text: resultText, usage, finishReason } = await generateText({
					model: groq(modelId),
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
				message: `Groq text generation failed: ${error instanceof Error ? error.message : String(error)}`,
				providerName: this.config.name,
				modelId: modelId,
				cause: error
			})
		});
	}

	/** Generates embeddings using the Vercel AI SDK */
	public generateEmbedding(_options: GenerateEmbeddingOptions): EmbeddingGenerationEffect {
		return Effect.fail(new ProviderCapabilityUnavailableError({ providerName: this.providerId, capability: 'embeddings' }));
	}

	/** Generates images using the Vercel AI SDK */
	public generateImage(_options: GenerateImageOptions): ImageGenerationEffect {
		return Effect.fail(new ProviderCapabilityUnavailableError({ providerName: this.providerId, capability: 'image-generation' }));
	}

	/** Generates structured objects using the Vercel AI SDK */
	public generateObject<T>(_options: GenerateObjectOptions<T>): ObjectGenerationEffect<T> {
		return Effect.fail(new ProviderCapabilityUnavailableError({ providerName: this.providerId, capability: 'object-generation' }));
	}
}
