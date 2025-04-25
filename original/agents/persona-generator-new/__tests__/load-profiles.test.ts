import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ModelService } from '../../../shared/services/model/modelService.js'
import { PromptService } from '../../../shared/services/prompt/promptService.js'
import { ProviderService } from '../../../shared/services/provider/providerService.js'
import { TaskService } from '../../../shared/services/task/TaskService.js'
import { type AgentConfig, AgentStatus } from '../../agent-service/Agent.js'
import { LoadProfilesNode } from '../nodes/load-profiles.js'
import type { PersonaGeneratorState } from '../types.js'

describe('LoadProfilesNode', () => {
    const testConfig: AgentConfig = {
        name: 'test-agent',
        description: 'Test agent for unit tests',
        version: '1.0.0',
        rootPath: process.cwd(),
        agentPath: path.join(process.cwd(), 'agents/persona-generator-new'),
        inputPath: path.join(process.cwd(), 'test-input'),
        outputPath: path.join(process.cwd(), 'test-output'),
        logPath: path.join(process.cwd(), 'test-output/logs'),
        maxConcurrency: 1,
        maxRetries: 3,
        retryDelay: 1000,
        configFiles: {
            providers: 'providers.json',
            models: 'models.json',
            prompts: 'prompts.json',
            tasks: 'tasks.json'
        },
        tags: ['test']
    }

    const taskService = new TaskService(testConfig.agentPath)
    const providerService = new ProviderService(testConfig)
    const modelService = new ModelService(testConfig)
    const promptService = new PromptService(testConfig)

    let initialState: PersonaGeneratorState

    beforeEach(() => {
        // Create test input directory
        fs.mkdirSync(testConfig.inputPath, { recursive: true })

        // Create test profile
        const testProfile = {
            id: 'test-1',
            name: 'Test User',
            bio: 'A test user profile',
            interests: ['testing', 'coding'],
            skills: ['unit testing', 'TypeScript'],
            traits: ['detail-oriented', 'analytical']
        }
        fs.writeFileSync(
            path.join(testConfig.inputPath, 'test-profile.json'),
            JSON.stringify(testProfile, null, 2)
        )

        initialState = {
            config: testConfig,
            agentRun: {
                runId: 'test-run-123',
                startTime: new Date().toISOString(),
                outputDir: '',
                inputDir: '',
                completedSteps: []
            },
            status: AgentStatus.RUNNING,
            logs: { logs: [], logCount: 0 },
            errors: { errors: [], errorCount: 0 },
            input: {
                profiles: []
            },
            output: {
                clusters: [],
                personas: []
            },
            agentState: {
                profiles: [],
                clusters: [],
                personas: []
            }
        }
    })

    afterEach(() => {
        // Clean up test directories
        if (fs.existsSync(testConfig.inputPath)) {
            fs.rmSync(testConfig.inputPath, { recursive: true })
        }
        if (fs.existsSync(testConfig.outputPath)) {
            fs.rmSync(testConfig.outputPath, { recursive: true })
        }
    })

    it('should load and validate profiles', async () => {
        const node = new LoadProfilesNode(taskService, providerService, modelService, promptService)
        const result = await node.execute(initialState)

        expect(result.status).toBe(AgentStatus.RUNNING)
        expect(result.agentState.profiles).toHaveLength(1)
        expect(result.agentState.profiles[0]).toMatchObject({
            id: 'test-1',
            name: 'Test User',
            bio: 'A test user profile',
            interests: ['testing', 'coding'],
            skills: ['unit testing', 'TypeScript'],
            traits: ['detail-oriented', 'analytical']
        })
    })

    it('should handle missing directory', async () => {
        const node = new LoadProfilesNode(taskService, providerService, modelService, promptService)
        fs.rmSync(testConfig.inputPath, { recursive: true })

        await expect(node.execute(initialState)).rejects.toThrow('Directory not found')
    })

    it('should handle empty directory', async () => {
        const node = new LoadProfilesNode(taskService, providerService, modelService, promptService)
        fs.rmSync(testConfig.inputPath, { recursive: true })
        fs.mkdirSync(testConfig.inputPath)

        await expect(node.execute(initialState)).rejects.toThrow('No normalized profile files found')
    })

    it('should handle invalid profile data', async () => {
        const node = new LoadProfilesNode(taskService, providerService, modelService, promptService)
        const invalidProfile = {
            id: 'test-1',
            name: 'Test User'
            // Missing required fields
        }
        fs.writeFileSync(
            path.join(testConfig.inputPath, 'invalid-profile.json'),
            JSON.stringify(invalidProfile, null, 2)
        )

        await expect(node.execute(initialState)).rejects.toThrow('Required')
    })
}) 