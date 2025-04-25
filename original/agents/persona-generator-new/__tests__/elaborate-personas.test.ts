import { mkdirSync, rmSync } from 'fs'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ModelService } from '../../../shared/services/model/modelService.js'
import { PromptService } from '../../../shared/services/prompt/promptService.js'
import { ProviderService } from '../../../shared/services/provider/providerService.js'
import { TaskService } from '../../../shared/services/task/TaskService.js'
import { type AgentConfig, AgentStatus } from '../../agent-service/Agent.js'
import { ElaboratePersonasNode } from '../nodes/elaborate-personas.js'
import type { PersonaGeneratorState } from '../types.js'

describe('ElaboratePersonasNode', () => {
    const testConfig: AgentConfig = {
        name: 'test-agent',
        description: 'Test agent for unit tests',
        version: '1.0.0',
        rootPath: '/tmp/test-agent',
        agentPath: '/tmp/test-agent/agent',
        inputPath: '/tmp/test-agent/input',
        outputPath: '/tmp/test-agent/output',
        logPath: '/tmp/test-agent/logs',
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
        mkdirSync(testConfig.outputPath, { recursive: true })

        initialState = {
            config: testConfig,
            agentRun: {
                runId: 'test-run-123',
                startTime: new Date().toISOString(),
                outputDir: testConfig.outputPath,
                inputDir: testConfig.inputPath,
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
                profiles: [
                    {
                        id: 'profile-1',
                        name: 'Test User 1',
                        bio: 'A test user profile',
                        interests: ['technology', 'coding'],
                        skills: ['programming', 'problem-solving'],
                        traits: ['analytical', 'detail-oriented']
                    },
                    {
                        id: 'profile-2',
                        name: 'Test User 2',
                        bio: 'Another test user profile',
                        interests: ['technology', 'ai'],
                        skills: ['programming', 'machine learning'],
                        traits: ['analytical', 'innovative']
                    }
                ],
                clusters: [
                    {
                        id: 'cluster-1',
                        name: 'Tech Enthusiasts',
                        description: 'Group of technology focused individuals',
                        profileIds: ['profile-1', 'profile-2'],
                        commonTraits: ['analytical', 'detail-oriented'],
                        commonInterests: ['technology', 'coding'],
                        commonSkills: ['programming', 'problem-solving']
                    }
                ],
                personas: []
            }
        }
    })

    afterEach(() => {
        rmSync(testConfig.outputPath, { recursive: true, force: true })
        vi.clearAllMocks()
    })

    it('should elaborate clusters into personas and save results', async () => {
        const node = new ElaboratePersonasNode(
            taskService,
            providerService,
            modelService,
            promptService
        )
        const result = await node.execute(initialState)

        expect(result.status).toBe(AgentStatus.RUNNING)
        expect(result.agentState.personas).toHaveLength(1)
        expect(result.agentState.personas[0]).toMatchObject({
            id: 'persona-1',
            name: 'Alex Chen',
            age: 32,
            occupation: 'Software Engineer',
            profileIds: ['profile-1', 'profile-2']
        })

        // Check that results were saved
        const savedPersonas = JSON.parse(
            fs.readFileSync(
                path.join(testConfig.outputPath, 'personas', 'detailed-personas.json'),
                'utf-8'
            )
        )
        expect(savedPersonas.personas).toHaveLength(1)
    })

    it('should handle empty clusters', async () => {
        const node = new ElaboratePersonasNode(
            taskService,
            providerService,
            modelService,
            promptService
        )
        const emptyState = {
            ...initialState,
            agentState: {
                ...initialState.agentState,
                clusters: []
            }
        }

        await expect(node.execute(emptyState)).rejects.toThrow('No clusters available')
    })

    it('should handle invalid LLM response', async () => {
        const node = new ElaboratePersonasNode(
            taskService,
            providerService,
            modelService,
            promptService
        )
        vi.spyOn(taskService, 'executeTask').mockResolvedValueOnce({
            result: 'Invalid response without JSON',
            metadata: {},
            taskName: 'elaborate-persona'
        })

        await expect(node.execute(initialState)).rejects.toThrow('No JSON found in response')
    })
}) 