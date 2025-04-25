import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TaskService } from '../../../shared/services/task/TaskService.js'
import { type AgentConfig, AgentStatus } from '../../agent-service/Agent.js'
import { InitializeRunNode } from '../nodes/initialize-run.js'
import type { PersonaGeneratorState } from '../types.js'

describe('InitializeRunNode', () => {
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

    let initialState: PersonaGeneratorState

    beforeEach(() => {
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
        if (fs.existsSync(testConfig.outputPath)) {
            fs.rmSync(testConfig.outputPath, { recursive: true })
        }
    })

    it('should initialize directories and update state', async () => {
        const node = new InitializeRunNode(taskService)
        const result = await node.execute(initialState)

        // Check state updates
        expect(result.status).toBe(AgentStatus.RUNNING)
        expect(result.agentRun.outputDir).toContain(initialState.agentRun.runId)
        expect(result.agentRun.inputDir).toBe(testConfig.inputPath)

        // Check directory creation
        const runDir = result.agentRun.outputDir
        expect(fs.existsSync(runDir)).toBe(true)
        expect(fs.existsSync(path.join(runDir, 'logs'))).toBe(true)
        expect(fs.existsSync(path.join(runDir, 'errors'))).toBe(true)
    })

    it('should handle errors gracefully', async () => {
        const node = new InitializeRunNode(taskService)
        const badState = {
            ...initialState,
            config: {
                ...testConfig,
                outputPath: '/nonexistent/path'
            }
        }

        await expect(node.execute(badState)).rejects.toThrow()
    })
}) 