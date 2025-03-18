import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Import modules first
import * as ai from 'ai';
import * as anthropicSdk from '@ai-sdk/anthropic';
import { AnthropicProvider } from '../implementations/anthropicProvider.js';

// Setup mock response
const mockGenerateTextResponse = {
  text: 'This is a test response from Anthropic',
  reasoning: undefined,
  reasoningDetails: [],
  sources: [],
  experimental_output: 'This is a test response from Anthropic',
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
    modelId: 'claude-3-opus',
    messages: []
  },
  logprobs: undefined,
  providerMetadata: undefined,
  experimental_providerMetadata: undefined
};




// Set up environment variables and mock before each test
beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
  
  // Create a mock Anthropic model with required properties
  const mockAnthropicModel = {
    specificationVersion: 'v1',
    provider: 'anthropic',
    modelId: 'claude-3-opus',
    defaultObjectGenerationMode: 'json',
    supportsImageUrls: false,
    getArgs: vi.fn(),
    doGenerate: vi.fn(),
    doStream: vi.fn()
  };
  
  // Mock the anthropic.languageModel function
  vi.spyOn(anthropicSdk.anthropic, 'languageModel').mockReturnValue(mockAnthropicModel as any);
  
  // Setup the spy on generateText
  vi.spyOn(ai, 'generateText').mockResolvedValue(mockGenerateTextResponse);
  
  // Clear previous mocks
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
  vi.clearAllMocks();
});

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  const mockModelConfig = {
    id: 'claude-3-opus',
    provider: 'anthropic' as const,
    modelName: 'claude-3-opus',
    contextWindowSize: 'large-context-window' as const,
    capabilities: ['text-generation' as const]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new AnthropicProvider(mockModelConfig);
  });

  describe('constructor', () => {
    it('should initialize with API key from environment variables', () => {
      expect(provider).toBeDefined();
    });

    it('should throw an error if API key is not set', () => {
      // Temporarily remove the API key
      const originalEnv = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = undefined;

      expect(() => {
        new AnthropicProvider(mockModelConfig);
      }).toThrow('ANTHROPIC_API_KEY environment variable is not set');

      // Restore the API key
      process.env.ANTHROPIC_API_KEY = originalEnv;
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

      expect(ai.generateText).toHaveBeenCalledWith({
        model: expect.anything(),
        prompt: 'Test prompt',
        temperature: 0.5,
        maxTokens: 100
      });

      expect(result).toEqual({
        modelId: 'claude-3-opus',
        text: 'This is a test response from Anthropic',
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



      expect(ai.generateText).toHaveBeenCalledWith({
        model: expect.anything(),
        prompt: 'Test prompt',
        temperature: 0.2, // Actual temperature used
        maxTokens: undefined
      });
    });

    it('should handle errors from the Anthropic API', async () => {
      const mockError = new Error('API error');
      vi.spyOn(ai, 'generateText').mockRejectedValueOnce(mockError);

      await expect(provider.complete({
        prompt: 'Test prompt'
      })).rejects.toThrow('Failed to complete prompt with Anthropic: Error: API error');
    });
  });
});
