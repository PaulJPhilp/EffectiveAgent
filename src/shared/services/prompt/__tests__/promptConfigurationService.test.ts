import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationError } from '../../configuration/types'
import { PromptConfigurationService } from '../promptConfigurationService'
import type { PromptConfigFile, PromptTemplate } from '../schemas/promptConfig'

// Mock prompt templates
const mockPromptTemplates: PromptTemplate[] = [
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
        systemPrompt: {
            promptTemplate: 'You are an expert on {{ topic }}',
            promptFileName: 'system.txt'
        },
        category: 'system'
    }
]

// Mock configuration file
const mockConfigFile: PromptConfigFile = {
    name: 'test-prompts',
    version: '1.0.0',
    prompts: mockPromptTemplates
}

describe('PromptConfigurationService', () => {
    let service: PromptConfigurationService

    beforeEach(() => {
        service = new PromptConfigurationService({
            configPath: './test/fixtures',
            environment: 'test'
        })
    })

    describe('loadConfig', () => {
        it('should load valid configurations successfully', () => {
            vi.spyOn(service['loader'], 'loadConfig').mockReturnValue(mockConfigFile)

            const config = service.loadConfig('prompts.json')
            expect(config).toBeDefined()
            expect(config.name).toBe('test-prompts')
            expect(config.prompts).toHaveLength(3)
        })

        it('should throw ConfigurationError for invalid configurations', () => {
            vi.spyOn(service['loader'], 'loadConfig').mockImplementation(() => {
                throw new Error('Failed to load config')
            })

            expect(() => service.loadConfig('prompts.json')).toThrow(ConfigurationError)
        })
    })

    describe('getPrompt', () => {
        beforeEach(() => {
            vi.spyOn(service['loader'], 'loadConfig').mockReturnValue(mockConfigFile)
            service.loadConfig('prompts.json')
        })

        it('should return prompt template for valid template ID', () => {
            const template = service.getPrompt('test-template')
            expect(template).toBeDefined()
            expect(template.id).toBe('test-template')
            expect(template.content).toBe('Hello {{ name }}')
        })

        it('should throw ConfigurationError for invalid template ID', () => {
            expect(() => service.getPrompt('invalid-template')).toThrow(ConfigurationError)
        })
    })

    describe('getPromptIds', () => {
        beforeEach(() => {
            vi.spyOn(service['loader'], 'loadConfig').mockReturnValue(mockConfigFile)
            service.loadConfig('prompts.json')
        })

        it('should return all template IDs', () => {
            const ids = service.getPromptIds()
            expect(ids).toEqual([
                'test-template',
                'template-with-variables',
                'template-with-systemPrompt'
            ])
        })
    })

    describe('getPromptsByCategory', () => {
        beforeEach(() => {
            vi.spyOn(service['loader'], 'loadConfig').mockReturnValue(mockConfigFile)
            service.loadConfig('prompts.json')
        })

        it('should return templates for valid category', () => {
            const templates = service.getPromptsByCategory('test')
            expect(templates).toHaveLength(2)
            expect(templates[0].id).toBe('test-template')
            expect(templates[1].id).toBe('template-with-variables')
        })

        it('should return empty array for invalid category', () => {
            const templates = service.getPromptsByCategory('invalid-category')
            expect(templates).toHaveLength(0)
        })
    })

    describe('validateConfig', () => {
        it('should return valid result for valid config', () => {
            const result = service['validateConfig'](mockConfigFile)
            expect(result.isValid).toBe(true)
        })

        it('should return invalid result for invalid config', () => {
            const invalidConfig = {
                name: 'invalid',
                version: '1.0.0'
                // missing prompts array
            } as any

            const result = service['validateConfig'](invalidConfig)
            expect(result.isValid).toBe(false)
            expect(result.errors).toBeDefined()
        })
    })
}) 