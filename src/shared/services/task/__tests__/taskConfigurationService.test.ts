import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigurationLoader } from '../../configuration/configurationLoader.js';
import { ConfigurationError } from '../../configuration/types.js';
import { TaskConfigurationError, TaskNotFoundError } from '../errors.js';
import { TaskConfigurationService } from '../taskConfigurationService.js';
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

// Invalid task configuration
const invalidTaskConfig = {
    name: 'test-tasks',
    version: '1.0.0',
    tasks: [
        {
            taskName: 'invalid-task',
            name: 'Invalid Task',
            // Missing required properties
            temperature: 0.7,
            contextWindowSize: 'medium-context-window',
            maxTokens: 100
        }
    ]
};

describe('TaskConfigurationService', () => {
    let configService: TaskConfigurationService;
    let mockLoadConfigFn: any;

    beforeEach(() => {
        // Create mock for loadConfig function
        mockLoadConfigFn = vi.fn().mockReturnValue(mockTaskConfig);

        // Setup spy on the configuration loader
        vi.spyOn(ConfigurationLoader.prototype, 'loadConfig')
            .mockImplementation(mockLoadConfigFn);

        // Create the configuration service
        configService = new TaskConfigurationService({
            configPath: 'test-path',
            environment: 'test',
            debug: false
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with the provided options', () => {
            expect(configService).toBeDefined();
        });

        it('should set debug mode if specified', () => {
            const debugSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            const debugConfigService = new TaskConfigurationService({
                configPath: 'test-path',
                environment: 'test',
                debug: true
            });

            expect(debugConfigService).toBeDefined();
            expect(debugSpy).toHaveBeenCalledWith(
                '[TaskConfigurationService] Initialized with path:',
                'test-path'
            );

            debugSpy.mockRestore();
        });
    });

    describe('loadConfig', () => {
        it('should load valid configuration files', () => {
            const config = configService.loadConfig('tasks.json');

            expect(config).toBeDefined();
            expect(config.name).toBe('test-tasks');
            expect(config.tasks).toHaveLength(2);
            expect(ConfigurationLoader.prototype.loadConfig).toHaveBeenCalledWith(
                'tasks.json',
                expect.objectContaining({
                    required: true
                })
            );
        });

        it('should throw ConfigurationError with invalid configuration path', () => {
            // Mock loader to throw an error
            mockLoadConfigFn.mockImplementationOnce(() => {
                throw new Error('File not found');
            });

            expect(() => configService.loadConfig('invalid-path.json'))
                .toThrow(ConfigurationError);
        });

        it('should throw TaskConfigurationError with invalid task configuration', () => {
            // Mock loader to return invalid configuration
            mockLoadConfigFn.mockReturnValueOnce(invalidTaskConfig);

            expect(() => configService.loadConfig('tasks.json'))
                .toThrow(TaskConfigurationError);
        });

        it('should log debug information when debug mode is enabled', () => {
            const debugSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            const debugConfigService = new TaskConfigurationService({
                configPath: 'test-path',
                environment: 'test',
                debug: true
            });

            debugConfigService.loadConfig('tasks.json');

            expect(debugSpy).toHaveBeenCalledWith(
                '[TaskConfigurationService] Loading configuration from: tasks.json'
            );
            expect(debugSpy).toHaveBeenCalledWith(
                '[TaskConfigurationService] Loaded 2 tasks'
            );

            debugSpy.mockRestore();
        });
    });

    describe('getTaskConfig', () => {
        beforeEach(() => {
            configService.loadConfig('tasks.json');
        });

        it('should return task configuration for valid task name', () => {
            const task = configService.getTaskConfig('test-task');

            expect(task).toBeDefined();
            expect(task.taskName).toBe('test-task');
            expect(task.name).toBe('Test Task');
        });

        it('should throw TaskNotFoundError for invalid task name', () => {
            expect(() => configService.getTaskConfig('non-existent-task'))
                .toThrow(TaskNotFoundError);
        });

        it('should throw ConfigurationError if configuration not loaded', () => {
            const unloadedService = new TaskConfigurationService({
                configPath: 'test-path',
                environment: 'test'
            });

            expect(() => unloadedService.getTaskConfig('test-task'))
                .toThrow(ConfigurationError);
        });
    });

    describe('getAllTaskConfigs', () => {
        beforeEach(() => {
            configService.loadConfig('tasks.json');
        });

        it('should return all task configurations', () => {
            const tasks = configService.getAllTaskConfigs();

            expect(tasks).toBeDefined();
            expect(tasks).toHaveLength(2);
            expect(tasks[0].taskName).toBe('test-task');
            expect(tasks[1].taskName).toBe('another-task');
        });

        it('should throw ConfigurationError if configuration not loaded', () => {
            const unloadedService = new TaskConfigurationService({
                configPath: 'test-path',
                environment: 'test'
            });

            expect(() => unloadedService.getAllTaskConfigs())
                .toThrow(ConfigurationError);
        });
    });

    describe('validateTaskConfig', () => {
        it('should return valid result for valid task configuration', () => {
            const result = configService.validateTaskConfig(mockTaskConfig.tasks[0]);

            expect(result).toBeDefined();
            expect(result.isValid).toBe(true);
        });

        it('should return invalid result for invalid task configuration', () => {
            const invalidTask = {
                taskName: 'invalid-task',
                name: 'Invalid Task',
                // Missing required properties
                temperature: 0.7,
                contextWindowSize: 'medium-context-window',
                maxTokens: 100
            };

            const result = configService.validateTaskConfig(invalidTask as any);

            expect(result).toBeDefined();
            expect(result.isValid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors?.length).toBeGreaterThan(0);
        });
    });
}); 