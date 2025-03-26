import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelService } from '../../model/modelService.js';
import { PromptService } from '../../prompt/promptService.js';
import type { IProviderService } from '../../provider/types.js';
import { TaskModelError, TaskNotFoundError, TaskPromptError } from '../errors.js';
import { TaskConfigurationService } from '../taskConfigurationService.js';
import { TaskService } from '../taskService.js';
import type { TaskConfigFile } from '../types.js';

// Mock task configuration
const mockTaskConfig: TaskConfigFile = {
    name: 'test-tasks',
    version: '1.0.0',
    tasks: [
        {
            taskName: 'test-task',
            name: 'Test Task',
            description: 'A test task for unit testing',
            primaryModelId: 'test-model',
            fallbackModelIds: ['fallback-model'],
            temperature: 0.7,
            requiredCapabilities: ['text-generation'],
            contextWindowSize: 'medium-context-window',
            promptName: 'test-prompt',
            thinkingLevel: 'medium',
            tags: ['test'],
            maxTokens: 100
        },
        {
            taskName: 'another-task',
            name: 'Another Test Task',
            primaryModelId: 'test-model-2',
            fallbackModelIds: [],
            temperature: 0.5,
            requiredCapabilities: ['text-generation', 'reasoning'],
            contextWindowSize: 'large-context-window',
            promptName: 'another-prompt',
            maxTokens: 200
        }
    ]
};

describe('TaskService', () => {
    // The task service instance
    let taskService: TaskService;

    // Mock services
    let mockConfigService: TaskConfigurationService;
    let mockModelService: ModelService;
    let mockPromptService: PromptService;
    let mockProviderService: IProviderService;

    // Mock implementation functions
    let mockConfigServiceLoadConfig: any;
    let mockConfigServiceGetTaskConfig: any;
    let mockConfigServiceGetAllTaskConfigs: any;
    let mockModelServiceGenerateText: any;
    let mockPromptServiceGeneratePrompt: any;

    beforeEach(() => {
        // Setup mock functions
        mockConfigServiceLoadConfig = vi.fn().mockReturnValue(mockTaskConfig);
        mockConfigServiceGetTaskConfig = vi.fn().mockImplementation((taskName: string) => {
            const task = mockTaskConfig.tasks.find(t => t.taskName === taskName);
            if (!task) {
                throw new TaskNotFoundError(taskName);
            }
            return task;
        });
        mockConfigServiceGetAllTaskConfigs = vi.fn().mockReturnValue(mockTaskConfig.tasks);

        mockModelServiceGenerateText = vi.fn().mockResolvedValue({
            text: 'Test model response',
            modelId: 'test-model',
            usage: {
                promptTokens: 10,
                completionTokens: 20,
                totalTokens: 30
            }
        });

        mockPromptServiceGeneratePrompt = vi.fn().mockResolvedValue('Test prompt content');

        // Create mock services
        mockConfigService = {
            loadConfig: mockConfigServiceLoadConfig,
            getTaskConfig: mockConfigServiceGetTaskConfig,
            getAllTaskConfigs: mockConfigServiceGetAllTaskConfigs
        } as unknown as TaskConfigurationService;

        mockModelService = {
            generateText: mockModelServiceGenerateText
        } as unknown as ModelService;

        mockPromptService = {
            generatePrompt: mockPromptServiceGeneratePrompt
        } as unknown as PromptService;

        mockProviderService = {} as IProviderService;

        // Create the task service with mock dependencies
        taskService = new TaskService(
            {
                configPath: 'test-path',
                environment: 'test',
                debug: false
            },
            {
                configService: mockConfigService,
                modelService: mockModelService,
                promptService: mockPromptService,
                providerService: mockProviderService
            }
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with the provided configuration', () => {
            expect(taskService).toBeDefined();
            expect(mockConfigServiceLoadConfig).toHaveBeenCalled();
        });

        it('should handle initialization errors', () => {
            // Mock the configuration service to throw an error
            const errorConfigService = {
                loadConfig: vi.fn().mockImplementation(() => {
                    throw new Error('Configuration loading failed');
                })
            } as unknown as TaskConfigurationService;

            // Creating service should throw
            expect(() => new TaskService(
                {
                    configPath: 'test-path',
                    environment: 'test'
                },
                {
                    configService: errorConfigService,
                    providerService: mockProviderService
                }
            )).toThrow('Failed to initialize TaskService');
        });
    });

    describe('getTaskByName', () => {
        it('should return a task by name', () => {
            const task = taskService.getTaskByName('test-task');
            expect(task).toBeDefined();
            expect(task.taskName).toBe('test-task');
        });

        it('should throw TaskNotFoundError for non-existent task', () => {
            expect(() => taskService.getTaskByName('non-existent-task'))
                .toThrow(TaskNotFoundError);
        });
    });

    describe('getAvailableTasks', () => {
        it('should return all available tasks', () => {
            const tasks = taskService.getAvailableTasks();
            expect(tasks).toHaveLength(2);
            expect(tasks[0].taskName).toBe('test-task');
            expect(tasks[1].taskName).toBe('another-task');
        });
    });

    describe('executeTask', () => {
        it('should execute a task and return result', async () => {
            const result = await taskService.executeTask('test-task');

            expect(result).toBeDefined();
            expect(result.taskName).toBe('test-task');
            expect(result.result).toBe('Test model response');
            expect(result.modelId).toBe('test-model');
            expect(result.usage).toBeDefined();
            expect(result.usage?.totalTokens).toBe(30);

            expect(mockPromptServiceGeneratePrompt).toHaveBeenCalledWith(
                { templateName: 'test-prompt' },
                expect.any(Object)
            );

            expect(mockModelServiceGenerateText).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: 'Test prompt content',
                    temperature: 0.7,
                    maxTokens: 100
                })
            );
        });

        it('should execute a task with custom options', async () => {
            const options = {
                temperature: 0.3,
                maxTokens: 50,
                systemPrompt: 'Custom system prompt',
                variables: { key: 'value' },
                format: 'json' as const
            };

            // Mock JSON response
            mockModelServiceGenerateText.mockResolvedValueOnce({
                text: '{"key": "value"}',
                json: { key: 'value' },
                modelId: 'test-model',
                usage: {
                    promptTokens: 10,
                    completionTokens: 20,
                    totalTokens: 30
                }
            });

            const result = await taskService.executeTask('test-task', options);

            expect(result).toBeDefined();
            expect(result.result).toBe('{"key":"value"}');

            expect(mockPromptServiceGeneratePrompt).toHaveBeenCalledWith(
                { templateName: 'test-prompt' },
                options.variables
            );

            expect(mockModelServiceGenerateText).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: 'Test prompt content',
                    temperature: options.temperature,
                    maxTokens: options.maxTokens,
                    systemPrompt: options.systemPrompt,
                    format: options.format
                })
            );
        });

        it('should throw TaskNotFoundError for non-existent task', async () => {
            await expect(taskService.executeTask('non-existent-task'))
                .rejects.toThrow(TaskNotFoundError);
        });

        it('should throw TaskPromptError when prompt generation fails', async () => {
            // Mock prompt service to throw an error
            mockPromptServiceGeneratePrompt.mockImplementationOnce(async () => {
                throw new Error('Prompt generation failed');
            });

            await expect(taskService.executeTask('test-task'))
                .rejects.toThrow(TaskPromptError);
        });

        it('should throw TaskModelError when model completion fails', async () => {
            // Mock model service to throw an error
            mockModelServiceGenerateText.mockRejectedValueOnce(
                new Error('Model completion failed')
            );

            await expect(taskService.executeTask('test-task'))
                .rejects.toThrow(TaskModelError);
        });
    });
}); 