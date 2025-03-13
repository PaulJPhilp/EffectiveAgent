import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ModelRegistryService } from '../../shared/services/model/index.js'

// Mock fs module
vi.mock('node:fs', () => ({
    promises: {
        readFile: vi.fn()
    }
}))

describe('ModelRegistryService', () => {
    const mockConfig = {
        models: [
            {
                id: 'test-model',
                provider: 'test-provider',
                modelName: 'test-model-name',
                maxTokens: 1000,
                temperature: 0.5,
                contextWindow: 4000,
                costPer1kTokens: 0.01,
                capabilities: ['text-generation']
            },
            {
                id: 'test-model-2',
                provider: 'test-provider',
                modelName: 'test-model-name-2',
                maxTokens: 2000,
                temperature: 0.7,
                contextWindow: 8000,
                costPer1kTokens: 0.02,
                capabilities: ['text-generation', 'chat']
            }
        ],
        taskMappings: [
            {
                taskName: 'test-task',
                primaryModelId: 'test-model',
                fallbackModelIds: ['test-model-2'],
                description: 'Test task description'
            }
        ],
        defaultModelId: 'test-model'
    }

    let modelRegistryService: ModelRegistryService

    beforeEach(() => {
        // Reset mocks
        vi.resetAllMocks()

        // Setup mock implementation
        vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockConfig))

        // Create service instance
        modelRegistryService = new ModelRegistryService({
            configPath: path.join(__dirname, 'test-config.json')
        })
    })

    afterEach(() => {
        vi.resetAllMocks()
    })

    it('should initialize and load configuration', async () => {
        await modelRegistryService.initialize()

        expect(fs.promises.readFile).toHaveBeenCalledTimes(1)
        expect(fs.promises.readFile).toHaveBeenCalledWith(
            path.join(__dirname, 'test-config.json'),
            'utf-8'
        )
    })

    it('should get model by ID', async () => {
        await modelRegistryService.initialize()

        const model = modelRegistryService.getModelById('test-model')

        expect(model).toBeDefined()
        expect(model?.id).toBe('test-model')
        expect(model?.modelName).toBe('test-model-name')
    })

    it('should return undefined for non-existent model ID', async () => {
        await modelRegistryService.initialize()

        const model = modelRegistryService.getModelById('non-existent-model')

        expect(model).toBeUndefined()
    })

    it('should get default model', async () => {
        await modelRegistryService.initialize()

        const model = modelRegistryService.getDefaultModel()

        expect(model).toBeDefined()
        expect(model?.id).toBe('test-model')
    })

    it('should get model for task', async () => {
        await modelRegistryService.initialize()

        const model = modelRegistryService.getModelForTask('test-task')

        expect(model).toBeDefined()
        expect(model?.id).toBe('test-model')
    })

    it('should get fallback model for task when primary is not available', async () => {
        await modelRegistryService.initialize()

        // Modify the config to make the primary model unavailable
        const modifiedConfig = { ...mockConfig }
        modifiedConfig.models = mockConfig.models.filter(model => model.id !== 'test-model')
        vi.mocked(fs.promises.readFile).mockResolvedValueOnce(JSON.stringify(modifiedConfig))

        // Reinitialize with modified config
        await modelRegistryService.initialize()

        const model = modelRegistryService.getModelForTask('test-task')

        expect(model).toBeDefined()
        expect(model?.id).toBe('test-model-2')
    })

    it('should get default model for unknown task', async () => {
        await modelRegistryService.initialize()

        const model = modelRegistryService.getModelForTask('unknown-task')

        expect(model).toBeDefined()
        expect(model?.id).toBe('test-model')
    })

    it('should throw error if used before initialization', () => {
        expect(() => modelRegistryService.getModelById('test-model')).toThrow(
            'Model registry not initialized'
        )
    })
}) 