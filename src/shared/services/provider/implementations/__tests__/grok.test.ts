import * as Effect from 'effect/Effect';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ProviderType, ModelCapability } from '@service/provider/types.js';
import type { ProviderConfig } from '@service/provider/types.js';
import { GrokProvider } from '../grok.js';
import { ProviderAuthError, ProviderCapabilityUnavailableError, ProviderRateLimitError } from '@service/provider/errors.js';
import { Either } from 'effect';

describe('GrokProvider', () => {
  const testConfig: ProviderConfig = {
    name: 'xAi',
    displayName: 'Grok',
    type: ProviderType.GROK,
    version: '1.0.0',
    tags: ['grok'],
    baseUrl: 'https://api.grok.x.ai/v1',
    rateLimit: {
      requestsPerMinute: 60
    }
  };

  let provider: GrokProvider;

  beforeEach(() => {
    // Mock environment variable
    process.env['XAI_API_KEY'] = 'test-api-key';
    provider = new GrokProvider(testConfig);
  });

  describe('text generation', () => {
    it('should generate text successfully', () => {
      const program = provider.generateText({
        modelId: 'grok-1',
        prompt: 'Test prompt'
      });

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(program);
        expect(result).toHaveProperty('text');
        expect(result).toHaveProperty('model', 'grok-1');
        expect(result).toHaveProperty('tokens');
        expect(result).toHaveProperty('raw');
      }));
    });

    it('should handle rate limit errors', () => {
      // Mock rate limit error
      const program = provider.generateText({
        modelId: 'grok-1',
        prompt: 'Test prompt'
      });

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(program));
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ProviderRateLimitError);
        }
      }));
    });

    it('should handle auth errors', () => {
      // Clear API key to trigger auth error
      delete process.env['XAI_API_KEY'];
      
      const program = provider.generateText({
        modelId: 'grok-1',
        prompt: 'Test prompt'
      });

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(program));
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ProviderAuthError);
        }
      }));
    });
  });

  describe('completion', () => {
    it('should complete text successfully', () => {
      const program = provider.complete('Test prompt', {
        modelId: 'grok-1',
        prompt: 'Test prompt'
      });

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(program);
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('model', 'grok-1');
        expect(result).toHaveProperty('tokens');
        expect(result).toHaveProperty('raw');
      }));
    });
  });

  describe('unsupported capabilities', () => {
    it('should fail image generation with capability error', () => {
      const program = provider.generateImage({
        modelId: 'grok-1',
        prompt: 'A beautiful sunset'
      });

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(program));
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ProviderCapabilityUnavailableError);
          expect(result.left.message).toContain('image');
        }
      }));
    });

    it('should fail embedding generation with capability error', () => {
      const program = provider.generateEmbedding({
        modelId: 'grok-1',
        text: 'Sample text'
      });

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(program));
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
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
        modelId: 'grok-1',
        prompt: 'Generate a user profile',
        schema: z.object({
          name: z.string(),
          email: z.string(),
          age: z.number()
        })
      });

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(program));
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ProviderCapabilityUnavailableError);
          expect(result.left.message).toContain('object');
        }
      }));
    });
  });

  describe('capability checks', () => {
    it('should support text generation', () => {
      const program = provider.supportsCapability(ModelCapability.TEXT_GENERATION);

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(program);
        expect(result).toBe(true);
      }));
    });

    it('should not support image generation', () => {
      const program = provider.supportsCapability(ModelCapability.IMAGE_GENERATION);

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(program);
        expect(result).toBe(false);
      }));
    });

    it('should not support embedding generation', () => {
      const program = provider.supportsCapability(ModelCapability.EMBEDDINGS);

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(program);
        expect(result).toBe(false);
      }));
    });

    it('should not support object generation', () => {
      const program = provider.supportsCapability(ModelCapability.OBJECT_GENERATION);

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(program);
        expect(result).toBe(false);
      }));
    });
  });
});
