import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { Task } from '../../../interfaces/task.js';
import { TaskRegistryService } from '../taskRegistryService.js';
import type { ModelCapability, ContextWindowSize } from '../../../schemas/modelConfig.js';
import path from 'node:path';

interface MockTaskConfig extends Task {
    readonly taskName: string;
    readonly description: string;
    readonly requiredCapabilities: ModelCapability[];
    readonly contextWindowSize: ContextWindowSize;
    readonly temperature: number;
    readonly primaryModelId: string;
    readonly fallbackModelIds: string[];
}

const TEST_CONFIG_PATH = path.join(process.cwd(), 'config', 'tasks.json');

const TEST_TASK_CONFIGS = {
    taskMappings: [
        {
            taskName: 'task1',
            primaryModelId: 'model1',
            fallbackModelIds: ['model2'],
            temperature: 0.7,
            requiredCapabilities: ['text-generation'],
            contextWindowSize: 'medium-context-window',
            description: 'Task 1 description',
            thinkingLevel: 'medium'
        },
        {
            taskName: 'task2',
            primaryModelId: 'model2',
            fallbackModelIds: ['model1'],
            temperature: 0.5,
            requiredCapabilities: ['text-generation'],
            contextWindowSize: 'small-context-window',
            description: 'Task 2 description',
            thinkingLevel: 'medium'
        }
    ] as MockTaskConfig[]
};

describe('TaskRegistryService', () => {
    let service: TaskRegistryService;

    beforeEach(async () => {
        const mockFs = {
            readFileSync: vi.fn().mockReturnValue(JSON.stringify(TEST_TASK_CONFIGS))
        };

        service = new TaskRegistryService({
            tasksConfigPath: TEST_CONFIG_PATH,
            fs: mockFs as any
        });
        await service.loadTaskConfigurations();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('initialization', () => {
        it('should load task configurations successfully', () => {
            const mappings = service.getAllTaskMappings();
            expect(mappings).toEqual(TEST_TASK_CONFIGS.taskMappings);
        });

        it('should throw error if config file is invalid', async () => {
            const mockFs = {
                readFileSync: vi.fn().mockReturnValue('invalid json')
            };
            const service = new TaskRegistryService({
                tasksConfigPath: TEST_CONFIG_PATH,
                fs: mockFs as any
            });

            await expect(service.loadTaskConfigurations())
                .rejects
                .toThrow('Failed to initialize task registry');
        });

        it('should throw error if config schema is invalid', async () => {
            const mockFs = {
                readFileSync: vi.fn().mockReturnValue(JSON.stringify({
                    taskMappings: [{ invalid: 'config' }]
                }))
            };
            const service = new TaskRegistryService({
                tasksConfigPath: TEST_CONFIG_PATH,
                fs: mockFs as any
            });

            await expect(service.loadTaskConfigurations())
                .rejects
                .toThrow('Failed to initialize task registry');
        });
    });

    describe('getAllTaskMappings', () => {
        it('should return all task mappings after initialization', () => {
            const mappings = service.getAllTaskMappings();
            expect(mappings).toEqual(TEST_TASK_CONFIGS.taskMappings);
        });
    });

    describe('getTaskConfig', () => {
        it('should return config for specified task after initialization', async () => {
            const config = await service.getTaskConfig('task1');
            expect(config).toEqual(TEST_TASK_CONFIGS.taskMappings[0]);
        });

        it('should return undefined if task is not found after initialization', async () => {
            const config = await service.getTaskConfig('non-existent-task');
            expect(config).toBeUndefined();
        });
    });

    describe('getAllTaskConfigs', () => {
        it('should return all task configs after initialization', async () => {
            const configs = await service.getAllTaskConfigs();
            expect(configs).toEqual(TEST_TASK_CONFIGS.taskMappings);
        });
    });

    describe('validateTaskConfig', () => {
        it('should validate correct task config after initialization', () => {
            const validConfig: Task = {
                taskName: 'test-task',
                primaryModelId: 'test-model',
                fallbackModelIds: [],
                temperature: 0.7,
                requiredCapabilities: ['text-generation'],
                contextWindowSize: 'medium-context-window',
                description: 'Test task description',
                thinkingLevel: 'medium',
                promptTemplate: 'Test'
            };

            expect(service.validateTaskConfig(validConfig)).toBe(true);
        });

        it('should reject invalid task config after initialization', () => {
            const invalidConfig = {
                taskName: 'test-task',
                temperature: 0.7
            };

            expect(service.validateTaskConfig(invalidConfig as Task))
                .toBe(false);
        });
    });
});
