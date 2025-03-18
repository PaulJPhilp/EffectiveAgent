import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import type { Mock } from 'vitest';
import { TaskService } from '../taskService.js';
import type { ModelService } from '../../model/modelService.js';
import type { ModelSelectionFactory } from '../../model/modelSelectionFactory.js';
import type { PromptService } from '../../prompt/promptService.js';
import type { TaskRegistryService } from '../taskRegistryService.js';
import type { Task } from '../../../interfaces/task.js';

interface MockDependencies {
    readonly modelService: ModelService;
    readonly modelSelectionFactory: ModelSelectionFactory;
    readonly promptService: PromptService;
    readonly taskRegistry: TaskRegistryService;
}

const TEST_DATA: Task = {
    taskName: 'test-task',
    description: 'Test task description',
    requiredCapabilities: ['text-generation'],
    primaryModelId: 'test-model',
    fallbackModelIds: ['fallback-model'],
    contextWindowSize: 'medium-context-window',
    thinkingLevel: 'medium',
    promptTemplate: 'Test'
};

describe('TaskService', () => {
    let context: {
        readonly service: TaskService;
        readonly mocks: MockDependencies;
    };

    beforeEach(async () => {
        const modelService = {
            completeWithModel: vi.fn(),
            completeWithDefaultModel: vi.fn(),
            generateImage: vi.fn(),
            generateEmbedding: vi.fn(),
            getDefaultModel: vi.fn(),
            createProvider: vi.fn(),
            completeWithThinkingLevel: vi.fn()
        } as unknown as ModelService;

        const modelSelectionFactory = {
            getModel: vi.fn(),
            selectModel: vi.fn(),
            getAllModels: vi.fn(),
            getModelsWithCapability: vi.fn(),
            getModelById: vi.fn(),
            getDefaultModel: vi.fn()
        } as unknown as ModelSelectionFactory;

        const promptService = {
            generatePrompt: vi.fn(),
            completePrompt: vi.fn(),
            completeClustering: vi.fn()
        } as unknown as PromptService;

        const taskRegistry = {
            getTaskConfig: vi.fn(),
            getAllTaskConfigs: vi.fn(),
            getAllTaskMappings: vi.fn(),
            validateTaskConfig: vi.fn(),
            loadTaskConfigurations: vi.fn().mockResolvedValue(undefined)
        } as unknown as TaskRegistryService;

        const mocks: MockDependencies = {
            modelService,
            modelSelectionFactory,
            promptService,
            taskRegistry
        };

        const service = new TaskService();
        Object.assign(service, {
            modelService,
            modelSelectionFactory,
            promptService,
            taskRegistry
        });

        await taskRegistry.loadTaskConfigurations();

        context = { service, mocks };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('getTaskByName', () => {
        const testGetExistingTask = async () => {
            // Setup
            const expectedTask: Task = {
                ...TEST_DATA,
                taskName: 'existing-task'
            };
            (context.mocks.taskRegistry.getTaskConfig as Mock)
                .mockResolvedValue(expectedTask);

            // Execute
            const result = await context.service.getTaskByName('existing-task');

            // Verify
            expect(result).toEqual(expectedTask);
            expect(context.mocks.taskRegistry.getTaskConfig)
                .toHaveBeenCalledWith('existing-task');
        };

        const testGetNonExistentTask = async () => {
            // Setup
            (context.mocks.taskRegistry.getTaskConfig as Mock)
                .mockResolvedValue(undefined);

            // Execute & Verify
            await expect(context.service.getTaskByName('non-existent'))
                .rejects
                .toThrow('Task not found: non-existent');
        };

        it('should return task when it exists', testGetExistingTask);
        it('should throw error when task not found', testGetNonExistentTask);
    });
});
