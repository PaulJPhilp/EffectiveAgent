import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TaskService } from '../../../shared/services/task/TaskService.js'
import { AgentStatus, type AgentConfig } from '../../agent-service/Agent.js'
import { SaveResultsNode } from '../nodes/save-results.js'
import type { PersonaGeneratorState } from '../types.js'

describe('SaveResultsNode', () => {
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
        // Create test output directory
        fs.mkdirSync(testConfig.outputPath, { recursive: true })

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
                    }
                ],
                clusters: [
                    {
                        id: 'cluster-1',
                        name: 'Tech Enthusiasts',
                        description: 'Group of technology focused individuals',
                        profileIds: ['profile-1'],
                        commonTraits: ['analytical', 'detail-oriented'],
                        commonInterests: ['technology', 'coding'],
                        commonSkills: ['programming', 'problem-solving']
                    }
                ],
                personas: [
                    {
                        id: 'persona-1',
                        name: 'Alex Chen',
                        age: 32,
                        occupation: 'Software Engineer',
                        background: '10 years in tech industry',
                        goals: ['Learn new technologies', 'Lead a team'],
                        painPoints: ['Time management', 'Work-life balance'],
                        behaviors: ['Early adopter', 'Problem solver'],
                        traits: ['analytical', 'detail-oriented'],
                        interests: ['technology', 'coding'],
                        skills: ['programming', 'problem-solving'],
                        profileIds: ['profile-1'],
                        clusterDescription: 'Tech-focused professionals'
                    }
                ]
            }
        }
    })

    afterEach(() => {
        // Clean up test directories
        if (fs.existsSync(testConfig.outputPath)) {
            fs.rmSync(testConfig.outputPath, { recursive: true })
        }
    })

    it('should save final results and generate summary', async () => {
        const node = new SaveResultsNode(taskService)
        const result = await node.execute(initialState)

        // Check state updates
        expect(result.status).toBe(AgentStatus.COMPLETED)
        expect(result.output.personas).toHaveLength(1)
        expect(result.output.clusters).toHaveLength(1)

        // Check saved files
        const finalResults = JSON.parse(
            fs.readFileSync(
                path.join(testConfig.outputPath, 'final-results.json'),
                'utf-8'
            )
        )
        expect(finalResults.personas).toHaveLength(1)
        expect(finalResults.clusters).toHaveLength(1)
        expect(finalResults.metadata).toMatchObject({
            totalProfiles: 1,
            totalClusters: 1,
            totalPersonas: 1
        })

        // Check summary file
        const summary = fs.readFileSync(
            path.join(testConfig.outputPath, 'summary.md'),
            'utf-8'
        )
        expect(summary).toContain('# Persona Generation Results')
        expect(summary).toContain('### Alex Chen')
        expect(summary).toContain('### Tech Enthusiasts')
    })

    it('should handle empty personas', async () => {
        const node = new SaveResultsNode(taskService)
        const emptyState = {
            ...initialState,
            agentState: {
                ...initialState.agentState,
                personas: []
            }
        }

        await expect(node.execute(emptyState)).rejects.toThrow('No personas available')
    })
}) 