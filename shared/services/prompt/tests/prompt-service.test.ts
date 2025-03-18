import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { PromptService } from '../promptService.js';
import type { PromptVariables } from '../../../interfaces/prompt.js';
import type { PromptOptions } from '../promptService.js';
import type { ModelCompletionResponse } from '../../provider/modelProvider.js';
import type { ModelService } from '../../model/modelService.js';
import type { PromptTemplateService } from '../promptTemplate.js';

/** Mock interfaces following testing guidelines */
interface MockTemplate {
    readonly systemPrompt?: string;
    readonly temperature?: number;
}

interface MockTemplateService {
    readonly getTemplate: Mock<[{ templateName: string }], MockTemplate>;
    readonly buildPrompt: Mock<
        [{ templateName: string }, PromptVariables], 
        string
    >;
}

interface MockModelService {
    readonly completeWithModel: Mock<
        [
            { modelId: string }, 
            {
                prompt: string;
                systemPrompt?: string;
                temperature?: number;
                maxTokens?: number;
            }
        ], 
        Promise<ModelCompletionResponse>
    >;
}

interface TestContext {
    readonly promptService: PromptService;
    readonly mockTemplateService: MockTemplateService;
    readonly mockModelService: MockModelService;
}

/** Test data following immutability guidelines */
const TEST_DATA = {
    templateName: 'test-template',
    modelId: 'test-model',
    variables: { key: 'value' } as const,
    template: {
        systemPrompt: 'default system prompt',
        temperature: 0.7
    } as const,
    prompt: 'Generated prompt text',
    response: 'Final response'
} as const;

/** Utility functions for test setup */
const createMockTemplateService = (): MockTemplateService => ({
    getTemplate: vi.fn(),
    buildPrompt: vi.fn()
});

const createMockModelService = (): MockModelService => ({
    completeWithModel: vi.fn()
});

const createContext = (): TestContext => {
    const mockTemplateService = createMockTemplateService();
    const mockModelService = createMockModelService();
    
    return {
        mockTemplateService,
        mockModelService,
        promptService: new PromptService()
    };
};

describe('PromptService', () => {
    let context: TestContext;

    beforeEach(() => {
        context = createContext();
    });

    describe('generatePrompt', () => {
        const testGeneratePrompt = async (
            options?: PromptOptions
        ): Promise<void> => {
            // Setup mock responses
            context.mockTemplateService.getTemplate
                .mockReturnValue(TEST_DATA.template);
            context.mockTemplateService.buildPrompt
                .mockReturnValue(TEST_DATA.prompt);
            context.mockModelService.completeWithModel
                .mockResolvedValue({
                    text: TEST_DATA.response,
                    usage: {
                        promptTokens: 50,
                        completionTokens: 50,
                        totalTokens: 100
                    },
                    modelId: TEST_DATA.modelId
                });

            const response = await context.promptService.generatePrompt(
                { templateName: TEST_DATA.templateName },
                TEST_DATA.variables,
                options
            );

            expect(context.mockTemplateService.getTemplate)
                .toHaveBeenCalledWith({ templateName: TEST_DATA.templateName });
            expect(context.mockTemplateService.buildPrompt)
                .toHaveBeenCalledWith(
                    { templateName: TEST_DATA.templateName }, 
                    TEST_DATA.variables
                );
            expect(context.mockModelService.completeWithModel)
                .toHaveBeenCalledWith(
                    { modelId: TEST_DATA.templateName },
                    {
                        prompt: TEST_DATA.prompt,
                        systemPrompt: options?.systemPrompt ?? 
                            TEST_DATA.template.systemPrompt,
                        temperature: options?.temperature ?? 
                            TEST_DATA.template.temperature,
                        maxTokens: options?.maxTokens
                    }
                );
            expect(response).toBe(TEST_DATA.response);
        };

        it('should generate prompt with default options', 
            () => testGeneratePrompt());

        it('should override template options with provided options', 
            () => testGeneratePrompt({
                systemPrompt: 'custom system prompt',
                temperature: 0.9,
                maxTokens: 100
            }));
    });

    describe('completePrompt', () => {
        const testCompletePrompt = async (
            options?: PromptOptions
        ): Promise<void> => {
            const prompt = 'Test prompt';
            context.mockModelService.completeWithModel
                .mockResolvedValue({
                    text: TEST_DATA.response,
                    usage: {
                        promptTokens: 50,
                        completionTokens: 50,
                        totalTokens: 100
                    },
                    modelId: TEST_DATA.modelId
                });

            const response = await context.promptService.completePrompt(
                TEST_DATA.modelId,
                prompt,
                options
            );

            expect(context.mockModelService.completeWithModel)
                .toHaveBeenCalledWith(
                    { modelId: TEST_DATA.modelId },
                    {
                        prompt,
                        ...options
                    }
                );
            expect(response).toBe(TEST_DATA.response);
        };

        it('should complete prompt with default options', 
            () => testCompletePrompt());

        it('should complete prompt with custom options', 
            () => testCompletePrompt({
                systemPrompt: 'custom system prompt',
                temperature: 0.9,
                maxTokens: 100
            }));

        it('should throw error when model completion fails', async () => {
            const prompt = 'Test prompt';
            context.mockModelService.completeWithModel
                .mockResolvedValue({
                    text: '',
                    usage: {
                        promptTokens: 0,
                        completionTokens: 0,
                        totalTokens: 0
                    },
                    modelId: TEST_DATA.modelId
                });

            await expect(context.promptService.completePrompt(
                TEST_DATA.modelId,
                prompt
            )).rejects.toThrow('Model completion failed');
        });

    });

    describe('completeClustering', () => {
        const CLUSTERING_PROFILES = [
            { id: '1', name: 'Profile 1' },
            { id: '2', name: 'Profile 2' }
        ] as const;

        const DEFAULT_SYSTEM_PROMPT = 'You are an expert data analyst specializing in user behavior clustering and pattern recognition.' as const;

        beforeEach(() => {
            context.mockTemplateService.getTemplate
                .mockReturnValue(TEST_DATA.template);
            context.mockTemplateService.buildPrompt
                .mockReturnValue(TEST_DATA.prompt);
            context.mockModelService.completeWithModel
                .mockResolvedValue({
                    text: TEST_DATA.response,
                    usage: {
                        promptTokens: 50,
                        completionTokens: 50,
                        totalTokens: 100
                    },
                    modelId: 'clustering'
                } as const);
        });

        it('should generate clustering prompt with default options', async () => {
            const response = await context.promptService
                .completeClustering(CLUSTERING_PROFILES);

            expect(context.mockTemplateService.getTemplate)
                .toHaveBeenCalledWith({ templateName: 'clustering' });
            expect(context.mockTemplateService.buildPrompt)
                .toHaveBeenCalledWith(
                    { templateName: 'clustering' },
                    { profiles: JSON.stringify(CLUSTERING_PROFILES, null, 2) }
                );
            expect(context.mockModelService.completeWithModel)
                .toHaveBeenCalledWith(
                    { modelId: 'clustering' },
                    {
                        prompt: TEST_DATA.prompt,
                        systemPrompt: DEFAULT_SYSTEM_PROMPT,
                        temperature: TEST_DATA.template.temperature,
                        maxTokens: undefined
                    }
                );
            expect(response).toBe(TEST_DATA.response);
        });

        it('should generate clustering prompt with custom options', async () => {
            const customOptions: PromptOptions = {
                systemPrompt: 'custom system prompt',
                temperature: 0.9,
                maxTokens: 100
            } as const;

            const response = await context.promptService
                .completeClustering(CLUSTERING_PROFILES, customOptions);

            expect(context.mockTemplateService.getTemplate)
                .toHaveBeenCalledWith({ templateName: 'clustering' });
            expect(context.mockTemplateService.buildPrompt)
                .toHaveBeenCalledWith(
                    { templateName: 'clustering' },
                    { profiles: JSON.stringify(CLUSTERING_PROFILES, null, 2) }
                );
            expect(context.mockModelService.completeWithModel)
                .toHaveBeenCalledWith(
                    { modelId: 'clustering' },
                    {
                        prompt: TEST_DATA.prompt,
                        systemPrompt: customOptions.systemPrompt,
                        temperature: customOptions.temperature,
                        maxTokens: customOptions.maxTokens
                    }
                );
            expect(response).toBe(TEST_DATA.response);
        });
    });
});
