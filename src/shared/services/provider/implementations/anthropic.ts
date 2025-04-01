// File: src/shared/services-effect/provider/implementations/anthropic.ts

import * as Effect from 'effect/Effect';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

import type { ProviderConfig, ModelCompletionOptions, GenerateObjectOptions, GenerateObjectResult, LLMCompletionResult, GenerateEmbeddingOptions, GenerateEmbeddingResult, GenerateImageOptions, GenerateImageResult, GenerateTextOptions, GenerateTextResult, ModelCapability, ProviderErrorType, ProviderId } from '../types.js';
import { ProviderImplementationError, ProviderCapabilityUnavailableError } from '../errors.js';
import type { ProviderError } from '../errors.js';
import { BaseModelProvider } from '../baseModelProvider.js';

/** Anthropic provider implementation using Vercel AI SDK */
export class AnthropicProvider extends BaseModelProvider {
	public readonly providerId: ProviderId;

	constructor(public config: ProviderConfig) {
		super(config.id as ProviderId, config);
		this.providerId = config.id as ProviderId;

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
	public supportsCapability(capability: ModelCapability): Effect.Effect<boolean, ProviderErrorType> {
		switch (capability) {
			case 'text':
				return Effect.succeed(true);
			case 'embedding':
			case 'image':
			case 'object':
				return Effect.succeed(false);
			default:
				return Effect.succeed(false);
		}
	}

	/** Generates text using the Vercel AI SDK */
	public generateText(options: GenerateTextOptions): Effect.Effect<GenerateTextResult, ProviderErrorType> {
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
	public complete(prompt: string, options?: ModelCompletionOptions): Effect.Effect<LLMCompletionResult, ProviderError> {
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
	public generateEmbedding(_options: GenerateEmbeddingOptions): Effect.Effect<GenerateEmbeddingResult, ProviderErrorType> {
		return Effect.fail(new ProviderCapabilityUnavailableError({ providerName: this.providerId, capability: 'embedding' }));
	}

	/** Generates images using the Vercel AI SDK */
	public generateImage(_options: GenerateImageOptions): Effect.Effect<GenerateImageResult, ProviderErrorType> {
		return Effect.fail(new ProviderCapabilityUnavailableError({ providerName: this.providerId, capability: 'image' }));
	}

	/** Generates structured objects using the Vercel AI SDK */
	public generateObject<T>(_options: GenerateObjectOptions<T>): Effect.Effect<GenerateObjectResult<T>, ProviderError> {
		return Effect.fail(new ProviderCapabilityUnavailableError({ providerName: this.providerId, capability: 'object' }));
	}
}
