import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { ConfigurationLoader } from '../../../shared/services/configuration/index.js'
import type { AgentConfig } from '../types.js'

describe('Persona Generator Agent Configuration', () => {
    const rootPath = join(process.cwd(), 'agents/persona-generator')
    const configLoader = new ConfigurationLoader({
        basePath: join(rootPath, 'config'),
        environment: process.env.NODE_ENV,
        validateSchema: true
    })

    it('should load config.json with correct structure', async () => {
        const config = await configLoader.loadConfig('config.json') as AgentConfig

        // Test basic configuration
        expect(config.name).toBe('persona-generator')
        expect(config.version).toBe('1.0.0')
        expect(config.description).toBe('Agent for persona generation')
        expect(config.maxConcurrency).toBe(5)
        expect(config.maxRetries).toBe(3)
        expect(config.retryDelay).toBe(1000)

        // Test paths
        expect(config.rootPath).toBe(join(process.cwd(), 'agents/persona-generator'))
        expect(config.agentPath).toBe(join(process.cwd(), 'agents/persona-generator'))
        expect(config.inputPath).toBe(join(process.cwd(), 'data/normalized'))
        expect(config.outputPath).toBe(join(process.cwd(), 'output'))
        expect(config.logPath).toBe(join(process.cwd(), 'logs'))

        // Test config file paths
        expect(config.configFiles.providers.path).toBe('../../../agents/config/providers.json')
        expect(config.configFiles.models.path).toBe('../../../agents/config/models.json')
        expect(config.configFiles.tasks.path).toBe('tasks.json')
        expect(config.configFiles.prompts.path).toBe('prompts.json')
    })

    it('should not contain model or provider definitions in config.json', async () => {
        const config = await configLoader.loadConfig('config.json') as AgentConfig

        // Verify no model definitions exist
        expect(config.models).toBeUndefined()

        // Verify no provider definitions exist
        expect(config.configFiles.providers.schema).toBeUndefined()
        expect(config.configFiles.models.schema).toBeUndefined()
        expect(config.configFiles.tasks.schema).toBeUndefined()
        expect(config.configFiles.prompts.schema).toBeUndefined()
    })
}) 