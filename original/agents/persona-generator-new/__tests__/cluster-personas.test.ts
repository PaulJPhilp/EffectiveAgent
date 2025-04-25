import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type AgentConfig, AgentStatus } from '../../agent-service/Agent.js'
import { TaskService } from '../../shared/services/task/taskService'
import { ClusterPersonasNode } from '../nodes/cluster-personas.js'
import type { PersonaGeneratorState } from '../types.js'

vi.mock('../../shared/services/task/taskService', () => ({
    TaskService: vi.fn().mockImplementation(() => ({
        executeTask: vi.fn().mockResolvedValue({
            result: `
Here's the clustering result:
\`\`\`json
{
    "clusters": [
        {
            "id": "cluster-1",
            "name": "Tech Enthusiasts",
            "description": "Group of technology focused individuals",
            "profileIds": ["profile-1", "profile-2"],
            "commonTraits": ["analytical", "detail-oriented"],
            "commonInterests": ["technology", "coding"],
            "commonSkills": ["programming", "problem-solving"]
        }
    ],
    "summary": "Created 1 cluster based on common interests and traits"
}
\`\`\`
`
        })
    }))
}))

describe('ClusterPersonasNode', () => {
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

    let initialState: PersonaGeneratorState

    beforeEach(() => {
        // Create test output directory
        fs.mkdirSync(path.join(testConfig.outputPath, 'clusters'), { recursive: true })

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
        vi.clearAllMocks()
    })

    it('should cluster profiles and save results', async () => {
        const mockTaskService = new TaskService()
        const node = new ClusterPersonasNode(mockTaskService)
        const result = await node.execute(initialState)

        expect(result.status).toBe(AgentStatus.RUNNING)
        expect(result.agentState.clusters).toHaveLength(1)
        expect(result.agentState.clusters[0]).toMatchObject({
            id: 'cluster-1',
            name: 'Tech Enthusiasts',
            description: 'Group of technology focused individuals',
            profileIds: ['profile-1', 'profile-2']
        })

        // Check that results were saved
        const savedClusters = JSON.parse(
            fs.readFileSync(
                path.join(testConfig.outputPath, 'clusters', 'basic-clusters.json'),
                'utf-8'
            )
        )
        expect(savedClusters.clusters).toHaveLength(1)
    })

    it('should handle empty profiles', async () => {
        const mockTaskService = new TaskService()
        const node = new ClusterPersonasNode(mockTaskService)
        const emptyState = {
            ...initialState,
            agentState: {
                ...initialState.agentState,
                profiles: []
            }
        }

        await expect(node.execute(emptyState)).rejects.toThrow('No profiles available')
    })

    it('should handle invalid LLM response', async () => {
        const mockTaskService = new TaskService()
        const node = new ClusterPersonasNode(mockTaskService)
        vi.mocked(mockTaskService.executeTask).mockResolvedValueOnce({
            result: 'Invalid response without JSON'
        })

        await expect(node.execute(initialState)).rejects.toThrow('No JSON found in response')
    })
}) 