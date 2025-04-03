import * as Effect from 'effect/Effect';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { type ProviderConfig, ProviderType, GenerateTextResult } from '../../types.js';
import { Either } from 'effect';
import { AnthropicProvider } from '../anthropic.js';
import { ProviderAuthError, ProviderImplementationError, ProviderRateLimitError, ProviderCapabilityUnavailableError } from '../../errors.js';

const testConfig: ProviderConfig = {
  name: 'anthropic',
  displayName: 'Anthropic',
  type: ProviderType.ANTHROPIC,
  version: '1.0.0',
  tags: ['anthropic'],
  apiKeyEnvVar: 'ANTHROPIC_API_KEY',
  baseUrl: 'https://api.anthropic.com/v1',
  rateLimit: {
    requestsPerMinute: 60 
  },
  modelIds: ['claude-2']
};

let provider: AnthropicProvider;

beforeEach(() => {
  // Mock environment variable
  process.env['ANTHROPIC_API_KEY'] = 'test-api-key';
  provider = new AnthropicProvider(testConfig);
});

describe('AnthropicProvider', () => {
  describe('completion', () => {
    it('should complete text successfully', () => {
      const program = provider.generateText({
        modelId: 'claude-2',
        prompt: 'Hello, how are you?'
      });

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(
          Effect.either(program)
        );
        expect(Either.isRight(result)).toBe(true);
        if (Either.isRight(result)) {
          const response = result.right as GenerateTextResult;
          expect(response).toBeDefined();
          expect(response.text).toBeDefined();
          expect(response.model).toBe('claude-2');
        }
      }));
    });
  });

  describe('unsupported capabilities', () => {
    it('should fail image generation with capability error', () => {
      const program = provider.generateImage({
        modelId: 'claude-2',
        prompt: 'A beautiful sunset'
      });

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(
          Effect.either(program)
        );
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          const error = result.left as ProviderCapabilityUnavailableError;
          expect(error).toBeInstanceOf(ProviderCapabilityUnavailableError);
          expect(error.message).toContain('image generation');
        }
      }));
    });

    it('should fail embedding generation with capability error', () => {
      const program = provider.generateEmbedding({
        modelId: 'claude-2',
        text: 'Sample text'
      });

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(Effect.either(program));
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          const error = result.left;
          expect(error).toBeInstanceOf(ProviderCapabilityUnavailableError);
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
        modelId: 'claude-2',
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
          const error = result.left;
          expect(error).toBeInstanceOf(ProviderCapabilityUnavailableError);
        }
      }));
    });
  });

  describe('capability checks', () => {
    it('should support text generation', () => {
      const program = provider.supportsCapability('text-generation');

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(program);
        expect(result).toBe(true);
      }));
    });

    it('should not support image generation', () => {
      const program = provider.supportsCapability('image-generation');

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(program);
        expect(result).toBe(false);
      }));
    });

    it('should not support embedding generation', () => {
      const program = provider.supportsCapability('embeddings');

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(program);
        expect(result).toBe(false);
      }));
    });

    it('should not support object generation', () => {
      const program = provider.supportsCapability('object-generation');

      return Effect.runPromise(Effect.gen(function* (_) {
        const result = yield* _(program);
        expect(result).toBe(false);
      }));
    });
  });
});
