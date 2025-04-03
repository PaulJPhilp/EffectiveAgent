// File: src/shared/services-effect/provider/implementations/anthropic.ts

import * as Effect from 'effect/Effect';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

import type { ProviderConfig, ModelCompletionOptions, GenerateObjectOptions, GenerateObjectResult, LLMCompletionResult, GenerateEmbeddingOptions, GenerateEmbeddingResult, GenerateImageOptions, GenerateImageResult, GenerateTextOptions, GenerateTextResult, ModelCapability, ProviderErrorType, ProviderId, ValidateEffect, CompletionEffect, TextGenerationEffect, ImageGenerationEffect, EmbeddingGenerationEffect, ObjectGenerationEffect } from '@service/provider/types.js';
import { ProviderImplementationError, ProviderCapabilityUnavailableError } from '@service/provider/errors.js';
import type { ProviderError } from '@service/provider/errors.js';
import { BaseModelProvider } from '@service/provider/baseModelProvider.js';
import { createProviderId } from '@service/provider/utils.js';

/** Anthropic provider implementation using Vercel AI SDK */
export class AnthropicProvider extends BaseModelProvider {
	public readonly providerId: ProviderId;

	constructor(public config: ProviderConfig) {
		super(config.name, config);
		this.providerId = createProviderId(config.name);

		const apiKey = process.env[config.apiKeyEnvVar ?? 'ANTHROPIC_API_KEY'];
		if (!apiKey) {
			throw new Error(`Anthropic API key is required (env var: ${config.apiKeyEnvVar ?? 'ANTHROPIC_API_KEY'})`);
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
			case 'image-generation':
			case 'embeddings':
			case 'object-generation':
				return Effect.succeed(false);
			default:
				return Effect.succeed(false);
		}
	}

	/** Generates text using the Vercel AI SDK */
	public generateText(options: GenerateTextOptions): TextGenerationEffect {
		const modelId = options.modelId ?? 'claude-3-opus-20240229';

		return Effect.tryPromise<GenerateTextResult, ProviderError>({
			try: async (signal: AbortSignal) => {
				const { text: resultText, usage } = await generateText({
					model: anthropic(modelId),
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
				message: `Anthropic text generation failed: ${error instanceof Error ? error.message : String(error)}`,
				providerName: this.config.name,
				modelId: modelId,
				cause: error
			})
		});
	}

	/** Generates text using Anthropic's API via Vercel AI SDK (matches BaseModelProvider) */
	public complete(prompt: string, options?: ModelCompletionOptions): CompletionEffect {
		const modelId = options?.modelId ?? 'claude-3-opus-20240229';

		return Effect.tryPromise<LLMCompletionResult, ProviderError>({
			try: async (signal: AbortSignal) => {
				const { text: resultText, usage, finishReason } = await generateText({
					model: anthropic(modelId),
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
				message: `Anthropic text generation failed: ${error instanceof Error ? error.message : String(error)}`,
				providerName: this.config.name,
				modelId: modelId,
				cause: error
			})
		});
	}

	/** Generates embeddings using the Vercel AI SDK */
	public generateEmbedding(_options: GenerateEmbeddingOptions): EmbeddingGenerationEffect {
		return Effect.fail(new ProviderCapabilityUnavailableError({ providerName: this.config.name, capability: 'embedding' }));
	}

	/** Generates images using the Vercel AI SDK */
	public generateImage(_options: GenerateImageOptions): ImageGenerationEffect {
		return Effect.fail(new ProviderCapabilityUnavailableError({ providerName: this.config.name, capability: 'image' }));
	}

	/** Generates structured objects using the Vercel AI SDK */
	public generateObject<T>(_options: GenerateObjectOptions<T>): ObjectGenerationEffect<T> {
		return Effect.fail(new ProviderCapabilityUnavailableError({ providerName: this.config.name, capability: 'object' }));
	}
}
