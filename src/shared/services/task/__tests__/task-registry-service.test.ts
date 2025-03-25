import { describe, expect, it } from 'vitest';
import { ContextWindowSizes, ModelCapabilities } from '../../model/schemas/modelConfig.js';
import { TaskRegistryService } from '../taskRegistryService.js';
import type { Task } from '../types.js';

interface MockTaskConfig extends Task {
    readonly taskName: string;
    readonly description: string;
    readonly requiredCapabilities: typeof ModelCapabilities[number][];
    readonly contextWindowSize: typeof ContextWindowSizes[number];
    readonly temperature: number;
    readonly primaryModelId: string;
    readonly fallbackModelIds: string[];
    readonly promptName: string;
    readonly thinkingLevel: 'none' | 'low' | 'medium' | 'high';
}

const TEST_TASKS = [
    {
        taskName: 'task1',
        primaryModelId: 'model1',
        fallbackModelIds: ['model2'],
        temperature: 0.7,
        requiredCapabilities: ['text-generation'],
        contextWindowSize: 'medium-context-window',
        description: 'Task 1 description',
        thinkingLevel: 'medium',
        promptName: 'task1-prompt'
    },
    {
        taskName: 'task2',
        primaryModelId: 'model2',
        fallbackModelIds: ['model1'],
        temperature: 0.5,
        requiredCapabilities: ['text-generation'],
        contextWindowSize: 'small-context-window',
        description: 'Task 2 description',
        thinkingLevel: 'medium',
        promptName: 'task2-prompt'
    }
] as MockTaskConfig[];

const TEST_AGENT_CONFIG = {
    name: 'test-agent',
    description: 'Test agent',
    tasks: TEST_TASKS
};

describe('TaskRegistryService', () => {
    describe('initialization', () => {
        it('should load task configurations successfully', () => {
            const service = new TaskRegistryService(TEST_AGENT_CONFIG);
            const tasks = service.getAllTaskConfigs();
            expect(tasks).toEqual(TEST_TASKS);
        });

        it('should handle empty task list', () => {
            const service = new TaskRegistryService({
                ...TEST_AGENT_CONFIG,
                tasks: []
            });
            const tasks = service.getAllTaskConfigs();
            expect(tasks).toEqual([]);
        });

        it('should apply default values for optional fields', () => {
            const minimalTask = {
                taskName: 'minimal-task',
                primaryModelId: 'test-model',
                promptName: 'test-prompt',
                contextWindowSize: 'medium-context-window',
                thinkingLevel: 'medium'
            };

            const service = new TaskRegistryService({
                ...TEST_AGENT_CONFIG,
                tasks: [minimalTask]
            });

            const tasks = service.getAllTaskConfigs();
            expect(tasks[0]).toMatchObject({
                taskName: 'minimal-task',
                primaryModelId: 'test-model',
                promptName: 'test-prompt',
                fallbackModelIds: [],
                requiredCapabilities: ['text-generation', 'function-calling'],
                contextWindowSize: 'medium-context-window',
                thinkingLevel: 'medium',
                maxAttempts: 3,
                timeout: 30000,
                temperature: 0.7,
                frequencyPenalty: 0,
                presencePenalty: 0,
                maxTokens: 4096
            });
        });
    });

    describe('getTaskConfig', () => {
        it('should return config for specified task', () => {
            const service = new TaskRegistryService(TEST_AGENT_CONFIG);
            const config = service.getTaskConfig('task1');
            expect(config).toEqual(TEST_TASKS[0]);
        });

        it('should return undefined if task is not found', () => {
            const service = new TaskRegistryService(TEST_AGENT_CONFIG);
            const config = service.getTaskConfig('non-existent-task');
            expect(config).toBeUndefined();
        });
    });

    describe('getAllTaskConfigs', () => {
        it('should return all task configs', () => {
            const service = new TaskRegistryService(TEST_AGENT_CONFIG);
            const configs = service.getAllTaskConfigs();
            expect(configs).toEqual(TEST_TASKS);
        });
    });

    describe('validateTaskConfig', () => {
        it('should validate correct task config', () => {
            const service = new TaskRegistryService(TEST_AGENT_CONFIG);
            const validConfig: Task = {
                taskName: 'test-task',
                primaryModelId: 'test-model',
                fallbackModelIds: [],
                temperature: 0.7,
                requiredCapabilities: ['text-generation'],
                contextWindowSize: 'medium-context-window',
                description: 'Test task description',
                thinkingLevel: 'medium',
                promptName: 'test-prompt'
            };

            expect(service.validateTaskConfig(validConfig)).toBe(true);
        });

        it('should reject invalid task config', () => {
            const service = new TaskRegistryService(TEST_AGENT_CONFIG);
            const invalidConfig = {
                taskName: 'test-task',
                temperature: 0.7
            };

            expect(service.validateTaskConfig(invalidConfig as Task))
                .toBe(false);
        });
    });
});
