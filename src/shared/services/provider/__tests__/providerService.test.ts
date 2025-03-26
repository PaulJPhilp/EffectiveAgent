import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { AgentConfig } from '../../../../agents/agent-service/types.js';
import type { ModelConfig } from '../../model/schemas/modelConfig.js';
import { OpenAIProvider } from '../implementations/openaiProvider.js';
import { ProviderService } from '../providerService.js';
import type { Provider } from '../schemas/providerConfig.js';
import type { IProviderConfigurationService } from '../types.js';
import { ProviderNotFoundError } from '../types.js';

describe('ProviderService', () => {
    const mockAgentConfig: AgentConfig = {
        name: 'test-agent',
        description: 'Test agent for provider service',
        version: '1.0.0',
        rootPath: '/test/path',
        agentPath: '/test/path/agent',
        inputPath: '/test/path/input',
        outputPath: '/test/path/output',
        logPath: '/test/path/logs',
        maxConcurrency: 1,
        maxRetries: 3,
        retryDelay: 1000,
        debug: true,
        environment: 'test',
        tasks: [],
        configFiles: {
            providers: '/test/path/config/providers.json',
            models: '/test/path/config/models.json',
            prompts: '/test/path/config/prompts.json',
            tasks: '/test/path/config/tasks.json'
        }
    };

    const mockOpenAIProviderConfig: Provider = {
        id: 'openai',
        name: 'OpenAI',
        type: 'openai' as const,
        rateLimit: { requestsPerMinute: 60 }
    };

    const mockAnthropicProviderConfig: Provider = {
        id: 'anthropic',
        name: 'Anthropic',
        type: 'anthropic' as const,
        rateLimit: { requestsPerMinute: 40 }
    };

    const mockModelConfig: ModelConfig = {
        id: 'gpt-4',
        modelName: 'gpt-4',
        provider: 'openai',
        maxTokens: 8192,
        temperature: 0.7,
        contextWindowSize: 'large',
        capabilities: ['text-generation'],
        description: 'GPT-4 model'
    };

    // Mock provider configuration service with proper types for vi.fn()
    const mockProviderConfigService: IProviderConfigurationService = {
        loadConfigurations: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
        getProviderConfig: vi.fn<[string], Provider>(),
        getDefaultProviderConfig: vi.fn<[], Provider>(),
        getAllProviderConfigs: vi.fn<[], Provider[]>().mockReturnValue([]),
        clearCache: vi.fn<[], void>()
    };

    // Mock model configuration service with proper types for vi.fn()
    const mockModelConfigService = {
        getModel: vi.fn<[string], ModelConfig>(),
        getDefaultModel: vi.fn<[], ModelConfig>()
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup mock provider config service
        (mockProviderConfigService.getProviderConfig as any).mockImplementation((id: string) => {
            if (id === 'openai') return mockOpenAIProviderConfig;
            if (id === 'anthropic') return mockAnthropicProviderConfig;
            throw new Error(`Provider not found: ${id}`);
        });

        (mockProviderConfigService.getDefaultProviderConfig as any).mockReturnValue(mockOpenAIProviderConfig);

        // Setup mock model config service
        (mockModelConfigService.getModel as any).mockImplementation((id: string) => {
            if (id === 'gpt-4') return mockModelConfig;
            throw new Error(`Model not found: ${id}`);
        });

        (mockModelConfigService.getDefaultModel as any).mockReturnValue(mockModelConfig);

        // Setup environment
        process.env['OPENAI_API_KEY'] = 'test-api-key';
        process.env['ANTHROPIC_API_KEY'] = 'test-api-key';
    });

    afterEach(() => {
        delete process.env['OPENAI_API_KEY'];
        delete process.env['ANTHROPIC_API_KEY'];
    });

    test('should get a provider by name', async () => {
        // Arrange
        const service = new ProviderService(
            mockAgentConfig,
            mockProviderConfigService,
            mockModelConfigService
        );

        // Act
        const provider = await service.getProvider('openai');

        // Assert
        expect(mockProviderConfigService.getProviderConfig).toHaveBeenCalledWith('openai');
        expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    test('should throw when getting non-existent provider', async () => {
        // Arrange
        (mockProviderConfigService.getProviderConfig as any).mockImplementation((id: string) => {
            throw new Error(`Provider not found: ${id}`);
        });

        const service = new ProviderService(
            mockAgentConfig,
            mockProviderConfigService,
            mockModelConfigService
        );

        // Act & Assert
        await expect(service.getProvider('non-existent')).rejects.toThrow(ProviderNotFoundError);
    });

    test('should get provider for model', async () => {
        // Arrange
        const service = new ProviderService(
            mockAgentConfig,
            mockProviderConfigService,
            mockModelConfigService
        );

        // Act
        const provider = await service.getProviderForModel('gpt-4');

        // Assert
        expect(mockModelConfigService.getModel).toHaveBeenCalledWith('gpt-4');
        expect(mockProviderConfigService.getProviderConfig).toHaveBeenCalledWith('openai');
        expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    test('should validate if provider exists', async () => {
        // Arrange
        const service = new ProviderService(
            mockAgentConfig,
            mockProviderConfigService,
            mockModelConfigService
        );

        // Act
        const exists = await service.validateProvider('openai');

        // Assert
        expect(mockProviderConfigService.getProviderConfig).toHaveBeenCalledWith('openai');
        expect(exists).toBe(true);
    });

    test('should return false when validating non-existent provider', async () => {
        // Arrange
        (mockProviderConfigService.getProviderConfig as any).mockImplementation((id: string) => {
            throw new Error(`Provider not found: ${id}`);
        });

        const service = new ProviderService(
            mockAgentConfig,
            mockProviderConfigService,
            mockModelConfigService
        );

        // Act
        const exists = await service.validateProvider('non-existent');

        // Assert
        expect(exists).toBe(false);
    });
}); 