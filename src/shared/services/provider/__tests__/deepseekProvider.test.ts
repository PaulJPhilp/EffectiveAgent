import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Import modules first
import * as ai from 'ai';
import { DeepSeekProvider } from '../implementations/deepseekProvider.js';

// Setup mock response
const mockGenerateTextResponse = {
  text: 'This is a test response from DeepSeek',
  reasoning: undefined,
  reasoningDetails: [],
  sources: [],
  experimental_output: 'This is a test response from DeepSeek',
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
    modelId: 'deepseek-coder',
    messages: []
  },
  logprobs: undefined,
  providerMetadata: undefined,
  experimental_providerMetadata: undefined,
  files: []
};


// Set up environment variables and mock before each test
beforeEach(() => {
  process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
  // Setup the spy on generateText
  vi.spyOn(ai, 'generateText').mockResolvedValue(mockGenerateTextResponse);
});

afterEach(() => {
  delete process.env.DEEPSEEK_API_KEY;
  vi.clearAllMocks();
});

describe('DeepSeekProvider', () => {
  let provider: DeepSeekProvider;
  const mockModelConfig = {
    id: 'deepseek-coder',
    provider: 'deepseek' as const,
    modelName: 'deepseek-coder',
    contextWindowSize: 'large-context-window' as const,
    capabilities: ['text-generation' as const]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new DeepSeekProvider(mockModelConfig);
  });

  describe('constructor', () => {
    it('should initialize with API key from environment variables', () => {
      expect(provider).toBeDefined();
    });

    it('should throw an error if API key is not set', () => {
      // Temporarily remove the API key
      const originalEnv = process.env.DEEPSEEK_API_KEY;
      process.env.DEEPSEEK_API_KEY = undefined;

      expect(() => {
        new DeepSeekProvider(mockModelConfig);
      }).toThrow('DEEPSEEK_API_KEY environment variable is not set');

      // Restore the API key
      process.env.DEEPSEEK_API_KEY = originalEnv;
    });
  });

  describe('complete', () => {
    it('should complete a prompt successfully', async () => {
      const mockResponse = {
        text: 'Test response',
        reasoning: undefined,
        reasoningDetails: [],
        sources: [],
        experimental_output: 'Test response',
        toolCalls: [],
        toolResults: [],
        finishReason: 'stop' as const,
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30
        },
        warnings: undefined,
        steps: [],
        request: {},
        response: {
          id: '123',
          timestamp: new Date(),
          modelId: 'deepseek-coder',
          messages: []
        },
        logprobs: undefined,
        providerMetadata: undefined,
        experimental_providerMetadata: undefined,
        files: []
      };

      vi.spyOn(ai, 'generateText').mockResolvedValue(mockResponse);

      const result = await provider.complete({
        prompt: 'Test prompt',
        temperature: 0.5,
        maxTokens: 100
      });
      

      // The provider passes through the temperature we provide
      expect(ai.generateText).toHaveBeenCalledWith({
        model: expect.anything(),
        prompt: 'Test prompt',
        temperature: 0.5,
        maxRetries: 0
      });

      expect(result).toEqual({
        text: 'Test response',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30
        },
        modelId: 'deepseek-coder',
        providerResponse: mockResponse
      });
    });

    it('should apply default options when not provided', async () => {
      const mockResponse = {
        text: 'Test response',
        reasoning: undefined,
        reasoningDetails: [],
        sources: [],
        experimental_output: 'Test response',
        toolCalls: [],
        toolResults: [],
        finishReason: 'stop' as const,
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30
        },
        warnings: undefined,
        steps: [],
        request: {},
        response: {
          id: '123',
          timestamp: new Date(),
          modelId: 'deepseek-coder',
          messages: []
        },
        logprobs: undefined,
        providerMetadata: undefined,
        experimental_providerMetadata: undefined,
        files:[]
      };

      vi.spyOn(ai, 'generateText').mockResolvedValue(mockResponse);

      const result = await provider.complete({
        prompt: 'Test prompt'
      });

      // For the default options test, check what the provider actually uses
      expect(ai.generateText).toHaveBeenCalledWith({
        model: expect.anything(),
        prompt: 'Test prompt',
        temperature: 0.2, // Default temperature used by the provider
        maxRetries: 0
      });
    });

    it('should handle errors from the DeepSeek API', async () => {
      const mockError = new Error('API error');
      vi.spyOn(ai, 'generateText').mockRejectedValue(mockError);

      await expect(provider.complete({
        prompt: 'Test prompt'
      })).rejects.toThrow('Failed to complete prompt with DeepSeek: Error: API error');
    });
  });
});
