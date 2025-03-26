import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationError } from '../../configuration/types.js'
import { PromptNotFoundError, PromptServiceError, PromptVariableMissingError } from '../errors.js'
import { PromptConfigurationService } from '../promptConfigurationService'
import { PromptService } from '../promptService'
import type { PromptServiceConfig, PromptTemplate } from '../types'

// Mock templates for testing
const mockPromptTemplates = [
    {
        id: 'test-template',
        name: 'Test Template',
        version: '1.0.0',
        content: 'Hello {{ name }}',
        variables: ['name'],
        category: 'test'
    },
    {
        id: 'template-with-variables',
        name: 'Variable Template',
        version: '1.0.0',
        content: 'Hello {{ name }}, your age is {{ age }}',
        variables: ['name', 'age'],
        category: 'test'
    },
    {
        id: 'template-with-systemPrompt',
        name: 'System Prompt Template',
        version: '1.0.0',
        content: 'Answer the question about {{ topic }}',
        variables: ['topic'],
        category: 'system',
        systemPrompt: {
            promptTemplate: 'You are an expert on {{ topic }}',
            promptFileName: 'system.txt'
        }
    }
]

// Mock configuration file
const mockConfigFile = {
    name: 'test-prompts',
    version: '1.0.0',
    prompts: mockPromptTemplates
}

describe('PromptService', () => {
    let promptService: PromptService
    let mockConfigService: any
    let consoleErrorSpy: any

    beforeEach(() => {
        // Create mock config service
        mockConfigService = {
            loadConfig: vi.fn().mockReturnValue(mockConfigFile),
            getPrompt: vi.fn((id) => {
                const template = mockPromptTemplates.find(t => t.id === id)
                if (!template) {
                    throw new Error(`Template not found: ${id}`)
                }
                return template
            }),
            getPromptIds: vi.fn(() => mockPromptTemplates.map(t => t.id))
        }

        // Mock the PromptConfigurationService constructor
        vi.spyOn(PromptConfigurationService.prototype, 'loadConfig')
            .mockImplementation(mockConfigService.loadConfig)

        vi.spyOn(PromptConfigurationService.prototype, 'getPrompt')
            .mockImplementation(mockConfigService.getPrompt)

        vi.spyOn(PromptConfigurationService.prototype, 'getPromptIds')
            .mockImplementation(mockConfigService.getPromptIds)

        // Mock console.error
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

        // Initialize with PromptServiceConfig
        const config: PromptServiceConfig = {
            configPath: 'prompts.json',
            environment: 'test'
        }
        promptService = new PromptService(config)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('constructor', () => {
        it('should initialize and load config', () => {
            const config: PromptServiceConfig = {
                configPath: 'test-prompts.json',
                debug: true,
                environment: 'development'
            }
            const service = new PromptService(config)
            expect(service).toBeDefined()
        })

        it('should handle configuration loading errors', () => {
            // Reset mocks for this test
            vi.restoreAllMocks()

            // Setup error case
            vi.spyOn(PromptConfigurationService.prototype, 'loadConfig')
                .mockImplementation(() => {
                    throw new ConfigurationError({
                        name: 'ConfigLoadError',
                        message: 'Failed to load configuration',
                        code: 'CONFIG_LOAD_ERROR'
                    })
                })

            // Re-mock console.error
            consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

            const config: PromptServiceConfig = {
                configPath: 'invalid-path.json'
            }

            expect(() => new PromptService(config)).toThrow(PromptServiceError)
            expect(consoleErrorSpy).toHaveBeenCalled()
        })
    })

    describe('getTemplate', () => {
        it('should return a prompt template by id', () => {
            const template = promptService.getTemplate({ templateName: 'test-template' })
            expect(template).toBeDefined()
            expect(template.id).toBe('test-template')
            expect(template.content).toBe('Hello {{ name }}')
        })

        it('should throw PromptNotFoundError for non-existent template', () => {
            // Override mock for this test
            mockConfigService.getPrompt.mockImplementationOnce(() => {
                throw new Error('Template not found')
            })

            expect(() => {
                promptService.getTemplate({ templateName: 'non-existent' })
            }).toThrow(PromptNotFoundError)
        })
    })

    describe('getTemplateIds', () => {
        it('should return all available template ids', () => {
            const ids = promptService.getTemplateIds()
            expect(ids).toEqual(['test-template', 'template-with-variables', 'template-with-systemPrompt'])
        })
    })

    describe('validateVariables', () => {
        it('should return true when all required variables are present', () => {
            const template = promptService.getTemplate({ templateName: 'template-with-variables' })
            const result = promptService.validateVariables(template, { name: 'John', age: 30 })
            expect(result).toBe(true)
        })

        it('should return false when required variables are missing', () => {
            const template = promptService.getTemplate({ templateName: 'template-with-variables' })
            const result = promptService.validateVariables(template, { name: 'John' })
            expect(result).toBe(false)
        })

        it('should return true when template has no variables', () => {
            const template = {
                id: 'no-vars',
                name: 'No Variables',
                version: '1.0.0',
                content: 'Static content',
                variables: [],
                category: 'test'
            }
            const result = promptService.validateVariables(template as PromptTemplate, {})
            expect(result).toBe(true)
        })
    })

    describe('generatePrompt', () => {
        it('should throw PromptVariableMissingError when variables are missing', async () => {
            const promise = promptService.generatePrompt(
                { templateName: 'template-with-variables' },
                { name: 'John' }
            )

            await expect(promise).rejects.toThrow(PromptVariableMissingError)
        })

        it('should throw PromptNotFoundError for non-existent template', async () => {
            // Override mock for this test
            mockConfigService.getPrompt.mockImplementationOnce(() => {
                throw new Error('Template not found')
            })

            const promise = promptService.generatePrompt(
                { templateName: 'non-existent' },
                { name: 'World' }
            )

            await expect(promise).rejects.toThrow(PromptNotFoundError)
        })
    })
}) 