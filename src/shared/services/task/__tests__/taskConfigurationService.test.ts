import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationError } from '../../configuration'
import type { Task } from '../../configuration/schemas/taskSchemas'
import type { BaseConfig } from '../../configuration/types/configTypes'
import { TaskConfigurationService } from '../taskConfigurationService'

interface TasksConfig extends BaseConfig {
    readonly updated: string;
    readonly groups: Record<string, {
        readonly name: string;
        readonly description: string;
        readonly tasks: Record<string, Task>;
    }>;
}

// Test fixture data
const mockTasksConfig: TasksConfig = {
    name: 'Test Tasks Config',
    version: '1.0',
    updated: '2024-03-20',
    groups: {
        'text-processing': {
            name: 'Text Processing Tasks',
            description: 'Tasks for processing text',
            tasks: {
                'summarize': {
                    name: 'Summarize Text',
                    description: 'Summarize the given text',
                    model: 'gpt-4',
                    prompt: 'summarize-prompt',
                    maxTokens: 1000,
                    temperature: 0.7,
                    metadata: {
                        thinkingLevel: 'high'
                    }
                }
            }
        },
        'analysis': {
            name: 'Analysis Tasks',
            description: 'Tasks for text analysis',
            tasks: {
                'analyze': {
                    name: 'Analyze Text',
                    description: 'Analyze the given text',
                    model: 'gpt-4',
                    prompt: 'analyze-prompt',
                    maxTokens: 1000,
                    temperature: 0.5,
                    metadata: {
                        thinkingLevel: 'medium'
                    }
                }
            }
        }
    }
}

describe('TaskConfigurationService', () => {
    let service: TaskConfigurationService

    beforeEach(() => {
        service = new TaskConfigurationService({
            configPath: './test/fixtures'
        })
    })

    afterEach(() => {
        service.clearCache()
        vi.clearAllMocks()
    })

    describe('loadConfigurations', () => {
        it('should load valid task configurations', async () => {
            vi.spyOn(service['loader'], 'loadConfig').mockResolvedValue(mockTasksConfig)

            await service.loadConfigurations()
            expect(service['tasksConfig']).toBeDefined()
        })

        it('should throw ConfigurationError for invalid configurations', async () => {
            vi.spyOn(service['loader'], 'loadConfig').mockRejectedValue(new Error('Invalid config'))

            await expect(service.loadConfigurations()).rejects.toThrow(ConfigurationError)
        })
    })

    describe('getTaskConfig', () => {
        beforeEach(async () => {
            vi.spyOn(service['loader'], 'loadConfig').mockResolvedValue(mockTasksConfig)
            await service.loadConfigurations()
        })

        it('should return task config for valid task ID', () => {
            const task = service.getTaskConfig('summarize')
            expect(task).toBeDefined()
            expect(task.name).toBe('Summarize Text')
        })

        it('should throw ConfigurationError for non-existent task', () => {
            expect(() => service.getTaskConfig('non-existent')).toThrow(ConfigurationError)
        })

        it('should throw ConfigurationError when configurations not loaded', () => {
            service.clearCache()
            expect(() => service.getTaskConfig('summarize')).toThrow(ConfigurationError)
        })
    })

    describe('getTasksByModel', () => {
        beforeEach(async () => {
            vi.spyOn(service['loader'], 'loadConfig').mockResolvedValue(mockTasksConfig)
            await service.loadConfigurations()
        })

        it('should return tasks for specified model ID', () => {
            const tasks = service.getTasksByModel('gpt-4')
            expect(tasks).toHaveLength(2)
            expect(tasks[0].name).toBe('Summarize Text')
            expect(tasks[1].name).toBe('Analyze Text')
        })

        it('should return empty array for non-existent model', () => {
            const tasks = service.getTasksByModel('non-existent')
            expect(tasks).toHaveLength(0)
        })

        it('should throw ConfigurationError when configurations not loaded', () => {
            service.clearCache()
            expect(() => service.getTasksByModel('gpt-4')).toThrow(ConfigurationError)
        })
    })

    describe('getTasksByGroup', () => {
        beforeEach(async () => {
            vi.spyOn(service['loader'], 'loadConfig').mockResolvedValue(mockTasksConfig)
            await service.loadConfigurations()
        })

        it('should return tasks for specified group', () => {
            const tasks = service.getTasksByGroup('text-processing')
            expect(tasks).toHaveLength(1)
            expect(tasks[0].name).toBe('Summarize Text')
        })

        it('should throw ConfigurationError for non-existent group', () => {
            expect(() => service.getTasksByGroup('non-existent')).toThrow(ConfigurationError)
        })

        it('should throw ConfigurationError when configurations not loaded', () => {
            service.clearCache()
            expect(() => service.getTasksByGroup('text-processing')).toThrow(ConfigurationError)
        })
    })

    describe('getAllTaskConfigs', () => {
        beforeEach(async () => {
            vi.spyOn(service['loader'], 'loadConfig').mockResolvedValue(mockTasksConfig)
            await service.loadConfigurations()
        })

        it('should return all available tasks', () => {
            const tasks = service.getAllTaskConfigs()
            expect(tasks).toHaveLength(2)
        })

        it('should throw ConfigurationError when configurations not loaded', () => {
            service.clearCache()
            expect(() => service.getAllTaskConfigs()).toThrow(ConfigurationError)
        })
    })
}) 