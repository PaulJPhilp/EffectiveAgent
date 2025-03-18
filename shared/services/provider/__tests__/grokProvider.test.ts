import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Import modules first
import * as ai from 'ai';
import { GrokProvider } from '../implementations/grokProvider.js';

// Setup mock response
const mockGenerateTextResponse = {
  text: 'This is a test response from Grok',
  reasoning: undefined,
  reasoningDetails: [],
  sources: [],
  experimental_output: 'This is a test response from Grok',
  toolCalls: [],
  toolResults: [],
  finishReason: 'stop' as const,
  usage: {
    promptTokens: 10,
    completionTokens: 5,
    totalTokens: 15
  },
  warnings: undefined,
  steps: [],
  request: {},
  response: {
    id: '123',
    timestamp: new Date(),
    modelId: 'grok-1',
    messages: []
  },
  logprobs: undefined,
  providerMetadata: undefined,
  experimental_providerMetadata: undefined
};


// Set up environment variables and mock before each test
beforeEach(() => {
  process.env.GROK_API_KEY = 'test-grok-key';
  // Setup the spy on generateText
  vi.spyOn(ai, 'generateText').mockResolvedValue(mockGenerateTextResponse);
});

afterEach(() => {
  delete process.env.GROK_API_KEY;
  vi.clearAllMocks();
});

describe('GrokProvider', () => {
  let provider: GrokProvider;
  const mockModelConfig = {
    id: 'grok-1',
    provider: 'grok' as const,
    modelName: 'grok-1',
    contextWindowSize: 'large-context-window' as const,
    capabilities: ['text-generation' as const]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GrokProvider(mockModelConfig);
  });

  describe('constructor', () => {
    it('should initialize with API key from environment variables', () => {
      expect(provider).toBeDefined();
    });

    it('should throw an error if API key is not set', () => {
      // Temporarily remove the API key
      const originalEnv = process.env.GROK_API_KEY;
      process.env.GROK_API_KEY = undefined;

      expect(() => {
        new GrokProvider(mockModelConfig);
      }).toThrow('GROK_API_KEY environment variable is not set');

      // Restore the API key
      process.env.GROK_API_KEY = originalEnv;
    });
  });

  describe('complete', () => {
    it('should complete a prompt successfully', async () => {
      const mockResponse = {
        text: 'This is a test response from Grok',
        reasoning: undefined,
        reasoningDetails: [],
        sources: [],
        experimental_output: 'This is a test response from Grok',
        toolCalls: [],
        toolResults: [],
        finishReason: 'stop' as const,
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15
        },
        warnings: undefined,
        steps: [],
        request: {},
        response: {
          id: '123',
          timestamp: new Date(),
          modelId: 'grok-1',
          messages: []
        },
        logprobs: undefined,
        providerMetadata: undefined,
        experimental_providerMetadata: undefined
      };

      vi.spyOn(ai, 'generateText').mockResolvedValue(mockResponse);

      const result = await provider.complete({
        prompt: 'Test prompt',
        temperature: 0.5,
        maxTokens: 100
      });

      expect(ai.generateText).toHaveBeenCalledWith({
        model: expect.anything(),
        prompt: 'Test prompt',
        temperature: 0.5,
        maxRetries: 0
      });

      expect(result).toEqual({
        text: 'This is a test response from Grok',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15
        },
        modelId: 'grok-1',
        providerResponse: mockResponse
      });
    });

    it('should apply default options when not provided', async () => {
      const mockResponse = {
        text: 'This is a test response from Grok',
        reasoning: undefined,
        reasoningDetails: [],
        sources: [],
        experimental_output: 'This is a test response from Grok',
        toolCalls: [],
        toolResults: [],
        finishReason: 'stop' as const,
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15
        },
        warnings: undefined,
        steps: [],
        request: {},
        response: {
          id: '123',
          timestamp: new Date(),
          modelId: 'grok-1',
          messages: []
        },
        logprobs: undefined,
        providerMetadata: undefined,
        experimental_providerMetadata: undefined
      };

      vi.spyOn(ai, 'generateText').mockResolvedValue(mockResponse);

      const result = await provider.complete({
        prompt: 'Test prompt'
      });

      expect(ai.generateText).toHaveBeenCalledWith({
        model: expect.anything(),
        prompt: 'Test prompt',
        temperature: 0.2, // Default temperature used by the provider
        maxRetries: 0 // Default max retries
      });
    });

    it('should handle errors from the Grok API', async () => {
      const mockError = new Error('API error');
      vi.spyOn(ai, 'generateText').mockRejectedValue(mockError);

      await expect(provider.complete({
        prompt: 'Test prompt'
      })).rejects.toThrow('Failed to complete prompt with Grok: Error: API error');
    });
  });
});
