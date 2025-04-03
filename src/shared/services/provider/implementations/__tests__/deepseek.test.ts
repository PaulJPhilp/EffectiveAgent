import * as Effect from 'effect/Effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { type ProviderConfig, ProviderType } from '@service/provider/types.js';
import { Either } from 'effect';
import { DeepSeekProvider } from '../deepseek.js';
import { ProviderAuthError, ProviderImplementationError, ProviderRateLimitError, ProviderCapabilityUnavailableError } from '@service/provider/errors.js';

const testConfig: ProviderConfig = {
  name: 'deepseek',
  displayName: 'DeepSeek',
  type: ProviderType.DEEPSEEK,
  version: '1.0.0',
  tags: ['deepseek'],
  apiKeyEnvVar: 'DEEPSEEK_API_KEY',
  baseUrl: 'https://api.deepseek.com/v1',
  rateLimit: {
    requestsPerMinute: 60
  }
};

let provider: DeepSeekProvider;

beforeEach(() => {
  // Mock environment variable
  process.env['DEEPSEEK_API_KEY'] = 'test-api-key';
  provider = new DeepSeekProvider(testConfig);
});

describe('DeepSeekProvider', () => {
  describe('text generation', () => {
    it('should generate text successfully', () => {
      const mockResponse = {
        data: {
          text: 'Hello, I am good.'
        }
      };

      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        ok: true,
        status: 200,
        headers: {
          forEach: () => {}
        }
      });

      global.fetch = mockFetch as any;

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(
          provider.generateText({
            modelId: 'deepseek-chat',
            prompt: 'Hello, how are you?'
          })
        ));

        if (Either.isLeft(result)) {
          const error = result.left;
          expect(error).toBeInstanceOf(ProviderImplementationError);
        } else {
          const response = result.right;
          expect(response).toBeDefined();
          expect(response.text).toBe('Hello, I am good.');
        }
      }));
    });

    it('should handle rate limit errors', () => {
      const mockResponse = {
        error: {
          message: 'Rate limit exceeded'
        }
      };

      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        ok: false,
        status: 429,
        headers: {
          forEach: () => {}
        }
      });

      global.fetch = mockFetch as any;

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(
          provider.generateText({
            modelId: 'deepseek-chat',
            prompt: 'Hello, how are you?'
          })
        ));

        if (Either.isLeft(result)) {
          const error = result.left;
          expect(error).toBeInstanceOf(ProviderImplementationError);
          expect(error.message).toContain('Failed to process error response');
          expect(error.message).toContain('Failed after 3 attempts');
        } else {
          const response = result.right;
          expect(response).toBeDefined();
        }
      }));
    }, 10000);

    it('should handle auth errors', () => {
      // Clear API key to trigger auth error
      delete process.env['DEEPSEEK_API_KEY'];
      
      const mockResponse = {
        error: {
          message: 'DeepSeek API key is missing'
        }
      };

      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        ok: false,
        status: 401,
        headers: {
          forEach: () => {}
        }
      });

      global.fetch = mockFetch as any;

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(
          provider.generateText({
            modelId: 'deepseek-chat',
            prompt: 'Hello, how are you?'
          })
        ));

        if (Either.isLeft(result)) {
          const error = result.left;
          expect(error).toBeInstanceOf(ProviderImplementationError);
          expect(error.message).toContain('API key');
        } else {
          const response = result.right;
          expect(response).toBeDefined();
        }
      }));
    });
  });

  describe('completion', () => {
    it('should complete text successfully', () => {
      const mockResponse = {
        data: {
          content: 'Test content',
          model: 'deepseek-coder-33b',
          tokens: 10,
          raw: {}
        }
      };

      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        ok: true,
        headers: {
          forEach: () => {}
        }
      });

      global.fetch = mockFetch as any;

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(
          provider.complete('Test prompt', {
            modelId: 'deepseek-coder-33b',
            prompt: 'Test prompt'
          })
        ));

        if (Either.isLeft(result)) {
          const error = result.left;
          expect(error).toBeInstanceOf(ProviderImplementationError);
        } else {
          const response = result.right;
          expect(response).toHaveProperty('content');
          expect(response).toHaveProperty('model', 'deepseek-coder-33b');
          expect(response).toHaveProperty('tokens');
          expect(response).toHaveProperty('raw');
        }
      }));
    });
  });

  describe('unsupported capabilities', () => {
    it('should fail image generation with capability error', () => {
      const mockResponse = {
        error: {
          message: 'Image generation is not supported.'
        }
      };

      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        ok: false,
        status: 501,
        headers: {
          forEach: () => {}
        }
      });

      global.fetch = mockFetch as any;

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(
          provider.generateImage({
            modelId: 'deepseek-coder-33b',
            prompt: 'A beautiful sunset'
          })
        ));

        if (Either.isLeft(result)) {
          const error = result.left;
          expect(error).toBeInstanceOf(ProviderCapabilityUnavailableError);
          expect(error.message).toContain('image');
        } else {
          const response = result.right;
          expect(response).toBeDefined();
        }
      }));
    });

    it('should fail embedding generation with capability error', () => {
      const mockResponse = {
        error: {
          message: 'Embedding generation is not supported.'
        }
      };

      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        ok: false,
        status: 501,
        headers: {
          forEach: () => {}
        }
      });

      global.fetch = mockFetch as any;

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(
          provider.generateEmbedding({
            modelId: 'deepseek-coder-33b',
            text: 'Test text'
          })
        ));

        if (Either.isLeft(result)) {
          const error = result.left;
          expect(error).toBeInstanceOf(ProviderCapabilityUnavailableError);
          expect(error.message).toContain('embedding');
        } else {
          const response = result.right;
          expect(response).toBeDefined();
        }
      }));
    });

    it('should fail object generation with capability error', () => {
      interface UserProfile {
        name: string;
        email: string;
        age: number;
      }

      const mockResponse = {
        error: {
          message: 'Object generation is not supported.'
        }
      };

      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        ok: false,
        status: 501,
        headers: {
          forEach: () => {}
        }
      });

      global.fetch = mockFetch as any;

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(
          provider.generateObject<UserProfile>({
            modelId: 'deepseek-coder-33b',
            prompt: 'Generate user profile',
            schema: z.object({
              name: z.string(),
              email: z.string(),
              age: z.number()
            })
          })
        ));

        if (Either.isLeft(result)) {
          const error = result.left;
          expect(error).toBeInstanceOf(ProviderCapabilityUnavailableError);
          expect(error.message).toContain('object');
        } else {
          const response = result.right;
          expect(response).toBeDefined();
        }
      }));
    });
  });

  describe('capability checks', () => {
    it('should support text generation', () => {
      const mockResponse = {
        data: {
          capabilities: ['text-generation']
        }
      };

      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        ok: true,
        headers: {
          forEach: () => {}
        }
      });

      global.fetch = mockFetch as any;

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(
          provider.supportsCapability('text-generation')
        ));

        if (Either.isLeft(result)) {
          const error = result.left;
          expect(error).toBeInstanceOf(ProviderImplementationError);
        } else {
          const response = result.right;
          expect(response).toBe(true);
        }
      }));
    });

    it('should not support image generation', () => {
      const mockResponse = {
        data: {
          capabilities: []
        }
      };

      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        ok: true,
        headers: {
          forEach: () => {}
        }
      });

      global.fetch = mockFetch as any;

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(
          provider.supportsCapability('image-generation')
        ));

        if (Either.isLeft(result)) {
          const error = result.left;
          expect(error).toBeInstanceOf(ProviderImplementationError);
        } else {
          const response = result.right;
          expect(response).toBe(false);
        }
      }));
    });

    it('should not support embedding generation', () => {
      const mockResponse = {
        data: {
          capabilities: []
        }
      };

      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        ok: true,
        headers: {
          forEach: () => {}
        }
      });

      global.fetch = mockFetch as any;

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(
          provider.supportsCapability('embeddings')
        ));

        if (Either.isLeft(result)) {
          const error = result.left;
          expect(error).toBeInstanceOf(ProviderImplementationError);
        } else {
          const response = result.right;
          expect(response).toBe(false);
        }
      }));
    });

    it('should not support object generation', () => {
      const mockResponse = {
        data: {
          capabilities: []
        }
      };

      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        ok: true,
        headers: {
          forEach: () => {}
        }
      });

      global.fetch = mockFetch as any;

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(
          provider.supportsCapability('object-generation')
        ));

        if (Either.isLeft(result)) {
          const error = result.left;
          expect(error).toBeInstanceOf(ProviderImplementationError);
        } else {
          const response = result.right;
          expect(response).toBe(false);
        }
      }));
    });
  });
});
