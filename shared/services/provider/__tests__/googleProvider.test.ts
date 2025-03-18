import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Import modules first
import * as ai from 'ai';
import { GoogleProvider } from '../implementations/googleProvider.js';

// Setup mock response
const mockGenerateTextResponse = {
  text: 'This is a test response from Google',
  reasoning: undefined,
  reasoningDetails: [],
  sources: [],
  experimental_output: 'This is a test response from Google',
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
    modelId: 'gemini-1.5-pro',
    messages: []
  },
  logprobs: undefined,
  providerMetadata: undefined,
  experimental_providerMetadata: undefined
};


// Set up environment variables and mock before each test
beforeEach(() => {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google-key';
  // Setup the spy on generateText
  vi.spyOn(ai, 'generateText').mockResolvedValue(mockGenerateTextResponse);
});

afterEach(() => {
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  vi.clearAllMocks();
});

describe('GoogleProvider', () => {
  let provider: GoogleProvider;
  const mockModelConfig = {
    id: 'gemini-1.5-pro',
    provider: 'google' as const,
    modelName: 'gemini-1.5-pro',
    contextWindowSize: 'large-context-window' as const,
    capabilities: ['text-generation' as const]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GoogleProvider(mockModelConfig);
  });

  describe('constructor', () => {
    it('should initialize with API key from environment variables', () => {
      expect(provider).toBeDefined();
    });

    it('should throw an error if API key is not set', () => {
      // Temporarily remove the API key
      const originalEnv = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = undefined;

      expect(() => {
        new GoogleProvider(mockModelConfig);
      }).toThrow('GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set');

      // Restore the API key
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalEnv;
    });
  });

  describe('complete', () => {
    it('should complete a prompt successfully', async () => {
      const mockResponse = {
        text: 'This is a test response from Google',
        reasoning: undefined,
        reasoningDetails: [],
        sources: [],
        experimental_output: 'This is a test response from Google',
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
          modelId: 'gemini-1.5-pro',
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
        maxTokens: 100
      });

      expect(result).toEqual({
        modelId: 'gemini-1.5-pro',
        text: 'This is a test response from Google',
        providerResponse: mockResponse,
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15
        }
      });
    });

    it('should apply default options when not provided', async () => {
      const mockResponse = {
        text: 'This is a test response from Google',
        reasoning: undefined,
        reasoningDetails: [],
        sources: [],
        experimental_output: 'This is a test response from Google',
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
          modelId: 'gemini-1.5-pro',
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

      console.log('Mock was called with:', (ai.generateText as any).mock.calls[0][0]);

      expect(ai.generateText).toHaveBeenCalledWith({
        model: expect.anything(),
        prompt: 'Test prompt',
        temperature: 0.2, // Actual temperature used
        maxTokens: undefined
      });
    });

    it('should handle errors from the Google API', async () => {
      const mockError = new Error('API error');
      vi.spyOn(ai, 'generateText').mockRejectedValue(mockError);

      await expect(provider.complete({
        prompt: 'Test prompt'
      })).rejects.toThrow('Failed to complete prompt with Google: Error: API error');
    });
  });
});
