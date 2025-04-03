// File: src/shared/services-effect/provider/implementations/perplexity.ts

import * as Effect from 'effect/Effect';
import { perplexity } from '@ai-sdk/perplexity';
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
import { 
  ProviderImplementationError, 
  ProviderCapabilityUnavailableError 
} from '@service/provider/errors.js';
import { BaseModelProvider } from '@service/provider/baseModelProvider.js';
import { createProviderId } from '@service/provider/utils.js';

/** Perplexity provider implementation using Vercel AI SDK */
export class PerplexityProvider extends BaseModelProvider {
  public readonly providerId: ProviderId;

  constructor(public config: ProviderConfig) {
    super(config.name, config);
    this.providerId = createProviderId(config.name);

    const apiKey = process.env[config.apiKeyEnvVar ?? 'PERPLEXITY_API_KEY'];
    if (!apiKey) {
      throw new Error(`Perplexity API key is required (env var: ${config.apiKeyEnvVar ?? 'PERPLEXITY_API_KEY'})`);
    }
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
    const modelId = options.modelId ?? 'pplx-70b-online';

    return Effect.tryPromise<GenerateTextResult, ProviderErrorType>({
      try: async (signal: AbortSignal) => {
        const { text: resultText, usage } = await generateText({
          model: perplexity(modelId),
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
        message: `Perplexity text generation failed: ${error instanceof Error ? error.message : String(error)}`,
        providerName: this.config.name,
        modelId: modelId,
        cause: error
      })
    });
  }

  /** Generates text using Perplexity's API via Vercel AI SDK (matches BaseModelProvider) */
  public complete(prompt: string, options?: ModelCompletionOptions): CompletionEffect {
    const modelId = options?.modelId ?? 'pplx-70b-online';

    return Effect.tryPromise<LLMCompletionResult, ProviderErrorType>({
      try: async (signal: AbortSignal) => {
        const { text: resultText, usage, finishReason } = await generateText({
          model: perplexity(modelId),
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
        message: `Perplexity text generation failed: ${error instanceof Error ? error.message : String(error)}`,
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
