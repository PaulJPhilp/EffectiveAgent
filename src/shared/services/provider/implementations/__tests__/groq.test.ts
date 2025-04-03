import * as Effect from 'effect/Effect';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ProviderType } from '@service/config-master/types/provider-config.js';
import type { ProviderConfig } from '@service/provider/types.js';
import { GroqProvider } from '../groq.js';
import { ProviderAuthError, ProviderCapabilityUnavailableError, ProviderImplementationError, ProviderRateLimitError } from '@service/provider/errors.js';

describe('GroqProvider', () => {
  const testConfig: ProviderConfig = {
    name: 'groq',
    displayName: 'Groq',
    type: ProviderType.GROQ,
    baseUrl: 'https://api.groq.com/v1',
    rateLimit: {
      requestsPerMinute: 60
    }
  };

  let provider: GroqProvider;

  beforeEach(() => {
    // Mock environment variable
    process.env.GROQ_API_KEY = 'test-api-key';
    provider = new GroqProvider(testConfig);
  });

  describe('text generation', () => {
    it('should generate text successfully', () => {
      const program = provider.generateText({
        modelId: 'mixtral-8x7b-32768',
        prompt: 'Test prompt'
      });

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(program);
        expect(result).toHaveProperty('text');
        expect(result).toHaveProperty('model', 'mixtral-8x7b-32768');
        expect(result).toHaveProperty('tokens');
        expect(result).toHaveProperty('raw');
      }));
    });

    it('should handle rate limit errors', () => {
      // Mock rate limit error
      const program = provider.generateText({
        modelId: 'mixtral-8x7b-32768',
        prompt: 'Test prompt'
      });

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(program));
        expect(Effect.isLeft(result)).toBe(true);
        if (Effect.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ProviderRateLimitError);
        }
      }));
    });

    it('should handle auth errors', () => {
      // Clear API key to trigger auth error
      delete process.env.GROQ_API_KEY;
      
      const program = provider.generateText({
        modelId: 'mixtral-8x7b-32768',
        prompt: 'Test prompt'
      });

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(program));
        expect(Effect.isLeft(result)).toBe(true);
        if (Effect.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ProviderAuthError);
        }
      }));
    });
  });

  describe('completion', () => {
    it('should complete text successfully', () => {
      const program = provider.complete('Test prompt', {
        modelId: 'mixtral-8x7b-32768'
      });

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(program);
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('model', 'mixtral-8x7b-32768');
        expect(result).toHaveProperty('tokens');
        expect(result).toHaveProperty('raw');
      }));
    });
  });

  describe('unsupported capabilities', () => {
    it('should fail image generation with capability error', () => {
      const program = provider.generateImage({
        modelId: 'mixtral-8x7b-32768',
        prompt: 'A beautiful sunset'
      });

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(program));
        expect(Effect.isLeft(result)).toBe(true);
        if (Effect.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ProviderCapabilityUnavailableError);
          expect(result.left.message).toContain('image');
        }
      }));
    });

    it('should fail embedding generation with capability error', () => {
      const program = provider.generateEmbedding({
        modelId: 'mixtral-8x7b-32768',
        text: 'Sample text'
      });

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(program));
        expect(Effect.isLeft(result)).toBe(true);
        if (Effect.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ProviderCapabilityUnavailableError);
          expect(result.left.message).toContain('embedding');
        }
      }));
    });

    it('should fail object generation with capability error', () => {
      interface UserProfile {
        name: string;
        email: string;
        age: number;
      }

      const program = provider.generateObject<UserProfile>({
        modelId: 'mixtral-8x7b-32768',
        prompt: 'Generate a user profile',
        schema: z.object({
          name: z.string(),
          email: z.string(),
          age: z.number()
        })
      });

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(program));
        expect(Effect.isLeft(result)).toBe(true);
        if (Effect.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ProviderCapabilityUnavailableError);
          expect(result.left.message).toContain('object');
        }
      }));
    });
  });

  describe('capability checks', () => {
    it('should support text generation', () => {
      const program = provider.supportsCapability('text');

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(program);
        expect(result).toBe(true);
      }));
    });

    it('should not support image generation', () => {
      const program = provider.supportsCapability('image');

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(program);
        expect(result).toBe(false);
      }));
    });

    it('should not support embedding generation', () => {
      const program = provider.supportsCapability('embedding');

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(program);
        expect(result).toBe(false);
      }));
    });

    it('should not support object generation', () => {
      const program = provider.supportsCapability('object');

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(program);
        expect(result).toBe(false);
      }));
    });
  });
});
