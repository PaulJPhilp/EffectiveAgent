import { describe, expect, it, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { ProviderFactory } from '../providerFactory.js';
import { OpenAIProvider } from '../implementations/openaiProvider.js';
import { AnthropicProvider } from '../implementations/anthropicProvider.js';
import { GoogleProvider } from '../implementations/googleProvider.js';
import { GrokProvider } from '../implementations/grokProvider.js';
import { DeepSeekProvider } from '../implementations/deepseekProvider.js';

// Set up environment variables for testing
beforeEach(() => {
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google-key';
  process.env.GROK_API_KEY = 'test-grok-key';
  process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
});

// Clean up environment variables after tests
afterEach(() => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  delete process.env.GROK_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  vi.clearAllMocks();
});

// Create mock for the ModelRegistryService
const mockGetModelById = vi.fn().mockImplementation((id) => {
  if (id === 'openai-model') {
    return {
      id: 'openai-model',
      provider: 'openai',
      modelName: 'gpt-4-turbo',
      contextWindowSize: 'large-context-window',
      capabilities: ['text-generation']
    };
  } else if (id === 'anthropic-model') {
    return {
      id: 'anthropic-model',
      provider: 'anthropic',
      modelName: 'claude-3-opus',
      contextWindowSize: 'large-context-window',
      capabilities: ['text-generation']
    };
  } else if (id === 'google-model') {
    return {
      id: 'google-model',
      provider: 'google',
      modelName: 'gemini-1.5-pro',
      contextWindowSize: 'large-context-window',
      capabilities: ['text-generation']
    };
  } else if (id === 'grok-model') {
    return {
      id: 'grok-model',
      provider: 'grok',
      modelName: 'grok-1',
      contextWindowSize: 'large-context-window',
      capabilities: ['text-generation']
    };
  } else if (id === 'deepseek-model') {
    return {
      id: 'deepseek-model',
      provider: 'deepseek',
      modelName: 'deepseek-coder',
      contextWindowSize: 'large-context-window',
      capabilities: ['text-generation']
    };
  } else {
    return null;
  }
});

const mockGetDefaultTemperature = vi.fn().mockReturnValue(0.7);

// Create mock for ModelRegistryService class
const mockGetDefaultModel = vi.fn().mockReturnValue({
  id: 'openai-model',
  provider: 'openai',
  modelName: 'gpt-4-turbo',
  contextWindowSize: 'large-context-window',
  capabilities: ['text-generation']
});

const mockModelRegistryService = {
  getModelById: mockGetModelById,
  getDefaultTemperature: mockGetDefaultTemperature,
  getDefaultModel: mockGetDefaultModel
};

// Create mock for ProviderRegistryService
const mockGetProviderByType = vi.fn().mockImplementation((type) => {
  return {
    type,
    baseUrl: 'https://api.example.com',
    apiVersion: 'v1'
  };
});

const mockGetProviderConfig = vi.fn().mockImplementation((type) => {
  return {
    type,
    baseUrl: 'https://api.example.com',
    apiVersion: 'v1'
  };
});

const mockProviderRegistryService = {
  getProviderByType: mockGetProviderByType,
  getProviderConfig: mockGetProviderConfig
};

// Create mocks for provider implementations
const mockOpenAIComplete = vi.fn().mockResolvedValue({ content: 'OpenAI response' });
const mockAnthropicComplete = vi.fn().mockResolvedValue({ content: 'Anthropic response' });
const mockGoogleComplete = vi.fn().mockResolvedValue({ content: 'Google response' });
const mockGrokComplete = vi.fn().mockResolvedValue({ content: 'Grok response' });
const mockDeepSeekComplete = vi.fn().mockResolvedValue({ content: 'DeepSeek response' });

// Mock the provider classes with vi.spyOn
vi.spyOn(OpenAIProvider.prototype, 'complete').mockImplementation(mockOpenAIComplete);
vi.spyOn(AnthropicProvider.prototype, 'complete').mockImplementation(mockAnthropicComplete);
vi.spyOn(GoogleProvider.prototype, 'complete').mockImplementation(mockGoogleComplete);
vi.spyOn(GrokProvider.prototype, 'complete').mockImplementation(mockGrokComplete);
vi.spyOn(DeepSeekProvider.prototype, 'complete').mockImplementation(mockDeepSeekComplete);

// Import and mock the ModelRegistryService and ProviderRegistryService modules
import * as modelRegistryModule from '../../model/modelRegistryService.js';
import * as providerRegistryModule from '../providerRegistry.js';

// Mock the ModelRegistryService and ProviderRegistryService
vi.spyOn(modelRegistryModule, 'ModelRegistryService').mockImplementation(() => mockModelRegistryService as any);
vi.spyOn(providerRegistryModule, 'ProviderRegistryService').mockImplementation(() => mockProviderRegistryService as any);

describe('ProviderFactory', () => {
  let providerFactory: ProviderFactory;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Create a new provider factory instance
    providerFactory = new ProviderFactory({
      configPath: '/path/to/config'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Clean up environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GROK_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
  });

  describe('createProviderForModelId', () => {
    it('should create an OpenAI provider for an OpenAI model', () => {
      const provider = providerFactory.createProviderForModelId('openai-model');
      
      // Instead of checking the constructor, verify the provider was created correctly
      expect(provider).toBeDefined();
      
      // Test that the provider works as expected
      provider.complete({ prompt: 'test' });
      expect(mockOpenAIComplete).toHaveBeenCalled();
    });

    it('should create an Anthropic provider for an Anthropic model', () => {
      const provider = providerFactory.createProviderForModelId('anthropic-model');
      
      // Verify the provider was created correctly
      expect(provider).toBeDefined();
      
      // Test that the provider works as expected
      provider.complete({ prompt: 'test' });
      expect(mockAnthropicComplete).toHaveBeenCalled();
    });

    it('should create a Google provider for a Google model', () => {
      const provider = providerFactory.createProviderForModelId('google-model');
      
      // Verify the provider was created correctly
      expect(provider).toBeDefined();
      
      // Test that the provider works as expected
      provider.complete({ prompt: 'test' });
      expect(mockGoogleComplete).toHaveBeenCalled();
    });

    it('should create a Grok provider for a Grok model', () => {
      const provider = providerFactory.createProviderForModelId('grok-model');
      
      // Verify the provider was created correctly
      expect(provider).toBeDefined();
      
      // Test that the provider works as expected
      provider.complete({ prompt: 'test' });
      expect(mockGrokComplete).toHaveBeenCalled();
    });

    it('should create a DeepSeek provider for a DeepSeek model', () => {
      const provider = providerFactory.createProviderForModelId('deepseek-model');
      
      // Verify the provider was created correctly
      expect(provider).toBeDefined();
      
      // Test that the provider works as expected
      provider.complete({ prompt: 'test' });
      expect(mockDeepSeekComplete).toHaveBeenCalled();
    });

    it('should throw an error for an unknown model ID', () => {
      expect(() => {
        providerFactory.createProviderForModelId('unknown-model');
      }).toThrow('Model not found');
    });
  });

  describe('createDefaultProvider', () => {
    it('should create a default provider with the correct temperature', () => {
      const providerWithConfig = providerFactory.createDefaultProvider();
      
      expect(providerWithConfig).toBeDefined();
      expect(providerWithConfig.temperature).toBe(0.7);
    });
  });
});
