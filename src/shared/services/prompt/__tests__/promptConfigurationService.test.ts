import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Prompts } from '../../configuration/schemas/promptSchemas'
import { PromptConfigurationService, PromptError } from '../promptConfigurationService'

// Test fixture data
const mockPrompts: Prompts = {
    'test-template': {
        name: 'Test Template',
        description: 'A test prompt template',
        systemPrompt: {
            promptTemplate: 'Hello {{ name }}',
            promptFileName: ''
        }
    },
    'template-with-subprompts': {
        name: 'Template with Subprompts',
        description: 'Template with ordered subprompts',
        systemPrompt: {
            promptTemplate: 'Main: {{ name }}\n{{0}}\n{{1}}',
            promptFileName: ''
        },
        subprompts: [
            {
                order: 1,
                promptTemplate: 'Second: {{ value }}',
                required: true,
                promptFileName: ''
            },
            {
                order: 0,
                promptTemplate: 'First: {{ value }}',
                required: true,
                promptFileName: ''
            }
        ]
    }
}

describe('PromptConfigurationService', () => {
    let service: PromptConfigurationService

    beforeEach(() => {
        service = new PromptConfigurationService('./test/fixtures')
    })

    afterEach(() => {
        service.clearCache()
        vi.clearAllMocks()
    })

    describe('loadPromptConfigurations', () => {
        it('should load valid prompt configurations', async () => {
            vi.spyOn(service['configLoader'], 'loadPromptsConfig').mockResolvedValue(mockPrompts)

            const result = await service.loadPromptConfigurations()
            expect(result).toBeDefined()
            expect(result['test-template']).toBeDefined()
        })

        it('should throw PromptError for invalid configurations', async () => {
            vi.spyOn(service['configLoader'], 'loadPromptsConfig').mockRejectedValue(new Error('Invalid config'))

            await expect(service.loadPromptConfigurations()).rejects.toThrow(PromptError)
        })
    })

    describe('getPromptTemplate', () => {
        beforeEach(async () => {
            vi.spyOn(service['configLoader'], 'loadPromptsConfig').mockResolvedValue(mockPrompts)
            await service.loadPromptConfigurations()
        })

        it('should return template for valid template name', () => {
            const template = service.getPromptTemplate('test-template')
            expect(template).toBeDefined()
            expect(template.name).toBe('Test Template')
        })

        it('should throw PromptError for non-existent template', () => {
            expect(() => service.getPromptTemplate('non-existent')).toThrow(PromptError)
        })

        it('should throw PromptError when configurations not loaded', () => {
            service.clearCache()
            expect(() => service.getPromptTemplate('test-template')).toThrow(PromptError)
        })
    })

    describe('getAllPromptTemplates', () => {
        beforeEach(async () => {
            vi.spyOn(service['configLoader'], 'loadPromptsConfig').mockResolvedValue(mockPrompts)
            await service.loadPromptConfigurations()
        })

        it('should return all available templates', () => {
            const templates = service.getAllPromptTemplates()
            expect(templates).toHaveLength(2)
        })

        it('should throw PromptError when configurations not loaded', () => {
            service.clearCache()
            expect(() => service.getAllPromptTemplates()).toThrow(PromptError)
        })
    })

    describe('buildPrompt', () => {
        beforeEach(async () => {
            vi.spyOn(service['configLoader'], 'loadPromptsConfig').mockResolvedValue(mockPrompts)
            await service.loadPromptConfigurations()
        })

        it('should render simple template with variables', async () => {
            const result = await service.buildPrompt('test-template', { name: 'World' })
            expect(result).toBe('Hello World')
        })

        it('should render template with ordered subprompts', async () => {
            const result = await service.buildPrompt('template-with-subprompts', {
                name: 'Main',
                value: 'Test'
            })
            expect(result).toBe('Main: Main\n0\n1\n\nFirst: Test\n\nSecond: Test')
        })

        it('should throw PromptError for non-existent template', async () => {
            await expect(service.buildPrompt('non-existent', {})).rejects.toThrow(PromptError)
        })

        it('should throw PromptError for template without prompt content', async () => {
            const invalidPrompts: Prompts = {
                'invalid': {
                    name: 'Invalid',
                    description: 'Invalid template',
                    systemPrompt: {
                        promptTemplate: '',
                        promptFileName: ''
                    }
                }
            }
            vi.spyOn(service['configLoader'], 'loadPromptsConfig').mockResolvedValue(invalidPrompts)
            await service.loadPromptConfigurations()

            await expect(service.buildPrompt('invalid', {})).rejects.toThrow(PromptError)
        })
    })
}) 