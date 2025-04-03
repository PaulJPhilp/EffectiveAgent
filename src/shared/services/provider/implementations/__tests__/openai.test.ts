import { Effect, Either } from 'effect';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ProviderType } from '../../../../config-master/types/provider-config.js';
import type { ProviderConfig } from '../../types.js';
import { OpenAIProvider } from '../openai.js';
import { ProviderAuthError, ProviderCapabilityUnavailableError, ProviderImplementationError, ProviderRateLimitError } from '../../errors.js';

interface UserProfile {
  name: string;
  email: string;
  age: number;
}

type TextResult = {
  text: string;
  model: string;
  usage: unknown;
  message?: string;
  raw?: unknown;
};

type ContentResult = {
  content: string;
  model: string;
  tokens: unknown;
  raw?: unknown;
};

type ImageResult = {
  urls: string[];
  model: string;
};

type EmbeddingResult = {
  embeddings: number[];
  model: string;
};

type ObjectResult = {
  object: Record<string, unknown>;
  model: string;
};

describe('OpenAIProvider', () => {
  const testConfig: ProviderConfig = {
    name: 'openai',
    displayName: 'OpenAI',
    type: ProviderType.OPENAI,
    baseUrl: 'https://api.openai.com/v1',
    rateLimit: {
      requestsPerMinute: 60
    },
    version: '1.0.0',
    tags: ['test']
  };

  let provider: OpenAIProvider;

  beforeEach(() => {
    // Mock environment variable
    process.env.OPENAI_API_KEY = 'test-api-key';
    provider = new OpenAIProvider(testConfig);
  });

  beforeEach(() => {
    provider = new OpenAIProvider({
      apiKey: 'test-key',
      modelId: 'gpt-4'
    });
  });

  describe('text generation', () => {
    it('should generate text successfully', () => {
      const program = provider.generateText({
        modelId: 'gpt-4',
        prompt: 'Test prompt'
      });

      return Effect.runPromise(
        program.pipe(
          Effect.flatMap((result: Either.Either<ProviderRateLimitError | ProviderAuthError | ProviderImplementationError, TextResult>) => {

        expect(result).toHaveProperty('text');
        expect(result).toHaveProperty('model', 'gpt-4');
        expect(result).toHaveProperty('usage');
        expect(result).toHaveProperty('raw');
            return Effect.succeed(undefined);
          })
        )
      );
    });

    it('should handle rate limit errors', () => {
      const program = provider.generateText({
        modelId: 'gpt-4',
        prompt: 'Test prompt'
      });

      return Effect.runPromise(
        Effect.either<ProviderRateLimitError | ProviderAuthError | ProviderImplementationError, TextResult, never>(program).pipe(
          Effect.map((result) => {
            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
              expect(result.left).toBeInstanceOf(ProviderRateLimitError);
            }
            return undefined;
          })
        )
      );
    });

    it('should handle auth errors', () => {
      // Clear API key to trigger auth error
      delete process.env.OPENAI_API_KEY;
      
      const program = provider.generateText({
        modelId: 'gpt-4',
        prompt: 'Test prompt'
      });

      return Effect.runPromise(
        Effect.either<ProviderRateLimitError | ProviderAuthError | ProviderImplementationError, TextResult, never>(program).pipe(
          Effect.map((result) => {
            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
              expect(result.left).toBeInstanceOf(ProviderAuthError);
            }
            return undefined;
          })
        )
      );
    });
  });

  describe('completion', () => {
    it('should complete text successfully', () => {
      const program = provider.complete('Test prompt', {
        modelId: 'gpt-4'
      });

      return Effect.runPromise(
        program.pipe(
          Effect.flatMap((result: Either.Either<ProviderRateLimitError | ProviderAuthError | ProviderImplementationError, TextResult>) => {

        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('model', 'gpt-4');
        expect(result).toHaveProperty('tokens');
        expect(result).toHaveProperty('raw');
            return Effect.succeed(undefined);
          })
        )
      );
    });
  });

  describe('image generation', () => {
    it('should generate images successfully', () => {
      const program = provider.generateImage({
        modelId: 'dall-e-3',
        prompt: 'A beautiful sunset'
      });

      return Effect.runPromise(
        program.pipe(
          Effect.map((result: ImageResult) => {
            expect(result).toHaveProperty('urls');
            expect(result.urls).toHaveLength(1);
            expect(result).toHaveProperty('model', 'dall-e-3');
            return undefined;
          })
        )
      );
    });

    it('should fail with unsupported model', () => {
      const program = provider.generateImage({
        modelId: 'gpt-4',
        prompt: 'A beautiful sunset'
      });

      return Effect.runPromise(
        program.pipe(
          Effect.flatMap((result: Either.Either<ProviderRateLimitError | ProviderAuthError | ProviderImplementationError, TextResult>) => {

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ProviderImplementationError);
          expect(result.left.message).toContain('does not support image generation');
        }
            return Effect.succeed(undefined);
          })
        )
      );
    });
  });

  describe('embedding generation', () => {
    it('should generate embeddings successfully', () => {
      const program = provider.generateEmbedding({
        modelId: 'text-embedding-3-large',
        text: 'Sample text'
      });

      return Effect.runPromise(
        program.pipe(
          Effect.map((result: EmbeddingResult) => {
            expect(result).toHaveProperty('embeddings');
            expect(result.embeddings).toHaveLength(1);
            expect(result).toHaveProperty('model', 'text-embedding-3-large');
            return undefined;
          })
        )
      );
    });
  });

  describe('object generation', () => {
    interface UserProfile {
      name: string;
      email: string;
      age: number;
    }

    it('should generate structured objects successfully', () => {
      const program = provider.generateObject<UserProfile>({
        modelId: 'gpt-4',
        prompt: 'Generate a user profile',
        schema: z.object({
          name: z.string(),
          email: z.string(),
          age: z.number()
        })
      });

      return Effect.runPromise(
        program.pipe(
          Effect.map((result: ObjectResult) => {
            expect(result).toHaveProperty('object');
            expect(result.object).toHaveProperty('name');
            expect(result.object).toHaveProperty('email');
            expect(result.object).toHaveProperty('age');
            expect(result).toHaveProperty('model', 'gpt-4');
            return undefined;
          })
        )
      );
    });

    it('should handle validation errors', () => {
      const program = provider.generateObject<UserProfile>({
        modelId: 'gpt-4',
        prompt: 'Generate an invalid user profile',
        schema: z.object({
          name: z.string(),
          email: z.string().email(),
          age: z.number().positive()
        })
      });

      return Effect.runPromise(
        program.pipe(
          Effect.flatMap((result: Either.Either<ProviderRateLimitError | ProviderAuthError | ProviderImplementationError, TextResult>) => {

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ProviderImplementationError);
          expect(result.left.message).toContain('validation failed');
        }
            return Effect.succeed(undefined);
          })
        )
      );
    });
  });

  describe('capability checks', () => {
    it('should support text generation', () => {
      const program = provider.supportsCapability('text');

      return Effect.runPromise(
        program.pipe(
          Effect.map((result: boolean) => {
            expect(result).toBe(true);
            return undefined;
          })
        )
      );
    });

    it('should support image generation', () => {
      const program = provider.supportsCapability('image');

      return Effect.runPromise(
        program.pipe(
          Effect.map((result: boolean) => {
            expect(result).toBe(true);
            return undefined;
          })
        )
      );
    });

    it('should support embedding generation', () => {
      const program = provider.supportsCapability('embedding');

      return Effect.runPromise(
        program.pipe(
          Effect.map((result: boolean) => {
            expect(result).toBe(true);
            return undefined;
          })
        )
      );
    });

    it('should support object generation', () => {
      const program = provider.supportsCapability('object');

      return Effect.runPromise(
        program.pipe(
          Effect.map((result: boolean) => {
            expect(result).toBe(true);
            return undefined;
          })
        )
      );
    });
  });
});
