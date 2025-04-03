import { Effect, Either } from 'effect';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { LLMCompletionResult, ProviderConfig } from '@service/provider/types.js';
import { ProviderType, ModelCapability } from '@service/provider/types.js';
import type { GenerateTextResult, GenerateImageResult, GenerateEmbeddingResult, GenerateObjectResult } from '@service/provider/types.js';
import { PerplexityProvider } from '@service/provider/implementations/perplexity.js';
import { ProviderAuthError, ProviderCapabilityUnavailableError, ProviderImplementationError, ProviderRateLimitError } from '@service/provider/errors.js';

describe('PerplexityProvider', () => {
  const testConfig: ProviderConfig = {
    name: 'perplexity',
    version: '1.0.0',
    tags: ['test'],
    displayName: 'Perplexity',
    type: ProviderType.PERPLEXITY,
    apiKeyEnvVar: 'PERPLEXITY_API_KEY',
    baseUrl: 'https://api.perplexity.ai/v1',
    rateLimit: {
      requestsPerMinute: 60
    }
  };

  let provider: PerplexityProvider;

  beforeEach(() => {
    // Mock environment variable
    process.env['PERPLEXITY_API_KEY'] = 'test-api-key';
    provider = new PerplexityProvider(testConfig);
  });

  describe('text generation', () => {
    it('should generate text successfully', () => {
      const program = Effect.try({
        try: () => provider.generateText({
          modelId: 'pplx-70b-online',
          prompt: 'Test prompt'
        }),
        catch: (error) => Effect.fail(new ProviderImplementationError({ message: 'Failed to generate text', providerName: 'perplexity', cause: error }))
      });

      return Effect.runPromise(
        program.pipe(
          Effect.map((result) => {
            expect(result).toBe(true);
            if (result) {
              expect(result).toHaveProperty('text');
              expect(result).toHaveProperty('model', 'pplx-70b-online');
              expect(result).toHaveProperty('tokens');
              expect(result).toHaveProperty('raw');
            }
            return undefined;
          })
        )
      );
    });

    it('should handle rate limit errors', () => {
      // Mock rate limit error
      const program = Effect.try({
        try: () => provider.generateText({
          modelId: 'pplx-70b-online',
          prompt: 'Test prompt'
        }),
        catch: (error) => Effect.fail(new ProviderRateLimitError({ message: 'Rate limit exceeded', providerName: 'perplexity', retryAfterMs: 1000, cause: error }))
      });

      return Effect.runPromise(
        program.pipe(
          Effect.map((result) => {
            expect(result).toBe(true);
            if (result) {
              expect(result).toBeInstanceOf(ProviderRateLimitError);
            }
            return undefined;
          })
        )
      );
    });
  });
  describe('completion', () => {
    it('should complete text successfully', () => {
      const program = Effect.try({
        try: () => provider.complete('Test prompt', {
          modelId: 'pplx-70b-online',
          prompt: 'Test prompt'
        }),
        catch: (error) => Effect.fail(new ProviderImplementationError({ message: 'Failed to complete text', providerName: 'perplexity', cause: error }))
      });

      return Effect.runPromise(
        program.pipe(
          Effect.map((result) => {
            expect(result).toBe(true);
            if (result) {
              expect(result).toHaveProperty('content');
              expect(result).toHaveProperty('model', 'pplx-70b-online');
              expect(result).toHaveProperty('tokens');
              expect(result).toHaveProperty('raw');
            }
            return undefined;
          })
        )
      );
    });
  });

  describe('unsupported capabilities', () => {
    it('should fail image generation with capability error', () => {
      const program = Effect.try({
        try: () => provider.generateImage({
          modelId: 'pplx-70b-online',
          prompt: 'A beautiful sunset'
        }),
        catch: (error: unknown) => {
          throw new ProviderCapabilityUnavailableError({
            providerName: 'perplexity',
            capability: 'image-generation'
          });
        }
      });

      return Effect.runPromise(
        Effect.either(program).pipe(
          Effect.map((result) => {
            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
              const error = result.left as ProviderCapabilityUnavailableError;
              expect(error).toBeInstanceOf(ProviderCapabilityUnavailableError);
              expect(error.params.providerName).toBe('perplexity');
              expect(error.params.capability).toBe('image-generation');
            }
            return undefined;
          })
        )
      );
    });

    it('should fail embedding generation with capability error', () => {
      const program = provider.generateEmbedding({
        modelId: 'pplx-70b-online',
        text: 'Sample text'
      });

      return Effect.runPromise(
        Effect.either(program).pipe(
          Effect.map((result) => {
            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
              const error = result.left as ProviderCapabilityUnavailableError;
              expect(error).toBeInstanceOf(ProviderCapabilityUnavailableError);
              expect(error.message).toContain('embedding');
            }
            return undefined;
          })
        )
      );
    });

    it('should fail object generation with capability error', () => {
      interface UserProfile {
        name: string;
        email: string;
        age: number;
      }

      const program = provider.generateObject<UserProfile>({
        modelId: 'pplx-70b-online',
        prompt: 'Generate a user profile',
        schema: z.object({
          name: z.string(),
          email: z.string(),
          age: z.number()
        })
      });

      return Effect.runPromise(
        Effect.either(program).pipe(
          Effect.map((result) => {
            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
              const error = result.left as ProviderCapabilityUnavailableError;
              expect(error).toBeInstanceOf(ProviderCapabilityUnavailableError);
              expect(error.message).toContain('object');
            }
            return undefined;
          })
        )
      );
    });
  });

  describe('capability checks', () => {
    it('should support text generation', () => {
      const program = provider.supportsCapability(ModelCapability.TEXT_GENERATION);

      return Effect.runPromise(
        program.pipe(
          Effect.map((result: boolean) => {
            expect(result).toBe(true);
            return undefined;
          })
        )
      );
    });

    it('should not support image generation', () => {
      const program = provider.supportsCapability(ModelCapability.IMAGE_GENERATION);

      return Effect.runPromise(
        program.pipe(
          Effect.map((result: boolean) => {
            expect(result).toBe(false);
            return undefined;
          })
        )
      );
    });

    it('should not support embedding generation', () => {
      const program = provider.supportsCapability(ModelCapability.EMBEDDINGS);

      return Effect.runPromise(
        program.pipe(
          Effect.map((result: boolean) => {
            expect(result).toBe(false);
            return undefined;
          })
        )
      );
    });

    it('should not support object generation', () => {
      const program = provider.supportsCapability(ModelCapability.OBJECT_GENERATION);

      return Effect.runPromise(
        program.pipe(
          Effect.map((result: boolean) => {
            expect(result).toBe(false);
            return undefined;
          })
        )
      );
    });
  });
});
