import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Import modules first
import * as ai from 'ai';
import * as openaiSdk from '@ai-sdk/openai';
import { OpenAIProvider } from '../implementations/openaiProvider.js';

// Setup mock response
const mockGenerateTextResponse = {
  text: 'This is a test response',
  reasoning: undefined,
  reasoningDetails: [],
  sources: [],
  experimental_output: 'This is a test response',
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
    modelId: 'gpt-4-turbo',
    messages: []
  },
  logprobs: undefined,
  providerMetadata: undefined,
  experimental_providerMetadata: undefined
};




// Set up environment variables and mock before each test
beforeEach(() => {
  process.env.OPENAI_API_KEY = 'test-openai-key';
  
  // Create a mock OpenAI model with required properties
  const mockOpenAIModel = {
    specificationVersion: 'v1',
    provider: 'openai',
    modelId: 'gpt-4-turbo',
    defaultObjectGenerationMode: 'json',
    supportsImageUrls: false,
    getArgs: vi.fn(),
    doGenerate: vi.fn(),
    doStream: vi.fn()
  };
  
  // Mock the openai.openai function to return our mock model
  vi.spyOn(openaiSdk, 'openai').mockReturnValue(mockOpenAIModel as any);
  
  // Setup the spy on generateText
  vi.spyOn(ai, 'generateText').mockResolvedValue(mockGenerateTextResponse);
  
  // Clear previous mocks
  vi.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
  delete process.env.OPENAI_API_KEY;
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  const mockModelConfig = {
    id: 'gpt-4-turbo',
    provider: 'openai' as const,
    modelName: 'gpt-4-turbo',
    contextWindowSize: 'large-context-window' as const,
    capabilities: ['text-generation' as const]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OpenAIProvider(mockModelConfig);
  });

  describe('constructor', () => {
    it('should initialize with API key from environment variables', () => {
      expect(provider).toBeDefined();
    });

    it('should throw an error if API key is not set', () => {
      // Temporarily remove the API key
      const originalEnv = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = undefined;

      expect(() => {
        new OpenAIProvider(mockModelConfig);
      }).toThrow('OPENAI_API_KEY environment variable is not set');

      // Restore the API key
      process.env.OPENAI_API_KEY = originalEnv;
    });
  });

  describe('complete', () => {
    it('should complete a prompt successfully', async () => {
      // Explicitly set up mock for this test
      vi.spyOn(ai, 'generateText').mockResolvedValue(mockGenerateTextResponse);

      const result = await provider.complete({
        prompt: 'Test prompt',
        temperature: 0.5,
        maxTokens: 100
      });

      console.log('Mock was called with:', (ai.generateText as any).mock.calls[0][0]);

      expect(ai.generateText).toHaveBeenCalledWith({
        model: expect.anything(),
        prompt: 'Test prompt',
        temperature: 0.5,
        maxRetries: 0
      });

      expect(result).toEqual({
        modelId: 'gpt-4-turbo',
        text: 'This is a test response',
        providerResponse: mockGenerateTextResponse,
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15
        }
      });
    });

    it('should apply default options when not provided', async () => {
      // Explicitly set up mock for this test
      vi.spyOn(ai, 'generateText').mockResolvedValue(mockGenerateTextResponse);

      const result = await provider.complete({
        prompt: 'Test prompt'
      });

      console.log('Mock was called with:', (ai.generateText as any).mock.calls[0][0]);

      expect(ai.generateText).toHaveBeenCalledWith({
        model: expect.anything(),
        prompt: 'Test prompt',
        temperature: 0.2, // Actual temperature used
        maxRetries: 0
      });
    });

    it('should handle errors from the OpenAI API', async () => {
      // Mock the generateText function to throw an error
      const mockError = new Error('API error');
      vi.spyOn(ai, 'generateText').mockRejectedValueOnce(mockError);
      
      await expect(provider.complete({
        prompt: 'Test prompt'
      })).rejects.toThrow('Failed to complete prompt with OpenAI: Error: API error');
    });
  });
});
