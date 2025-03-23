import type { RunnableConfig } from '@langchain/core/runnables'
import fs from 'node:fs'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PromptConfig } from '../../../shared/services/configuration/types/promptConfig.js'
import type { TaskDefinition } from '../../../shared/services/configuration/types/taskConfig.js'
import { clusterPersonasNode } from '../nodes/cluster-personas.js'
import { createInitialState } from '../state.js'
import type { NormalizedProfile } from '../types.js'

// Test data
const testProfiles: NormalizedProfile[] = [
    {
        name: 'Test User 1',
        title: 'Senior Software Engineer',
        location: 'San Francisco, CA',
        key_skills: ['TypeScript', 'Node.js', 'React'],
        contact: {
            email: 'test1@example.com',
            linkedin: 'https://linkedin.com/in/test1',
            company_website: 'https://example.com'
        },
        certificates: [
            {
                status: 'Active',
                name: 'AWS Certified Developer',
                issuing_organization: 'Amazon Web Services',
                issue_date: '2023-01-01',
                expiration_date: '2026-01-01',
                credential_id: 'AWS-1'
            }
        ],
        experience: [
            {
                company: 'Example Corp',
                title: 'Senior Software Engineer',
                duration: '2020-2023',
                description: ['Led development of key features', 'Mentored junior developers']
            }
        ]
    }
]

describe('Cluster Personas Node', () => {
    const rootPath = process.cwd()
    const outputDir = join(rootPath, 'output')
    const clustersDir = join(outputDir, 'clusters')

    beforeEach(() => {
        // Create output directories
        fs.mkdirSync(clustersDir, { recursive: true })
    })

    afterEach(() => {
        // Clean up output directories
        fs.rmSync(outputDir, { recursive: true, force: true })
    })

    it('should successfully cluster profiles into personas', async () => {
        // Create initial state with test profiles
        const initialState = createInitialState(
            'test-run-id',
            outputDir,
            join(rootPath, 'data/normalized'),
            {
                rootPath,
                agentPath: join(rootPath, 'agents/persona-generator'),
                inputPath: join(rootPath, 'data/normalized'),
                outputPath: outputDir,
                logPath: join(rootPath, 'logs'),
                name: 'persona-generator',
                version: '1.0.0',
                description: 'Test agent for persona clustering',
                maxConcurrency: 5,
                maxRetries: 3,
                retryDelay: 1000,
                models: {
                    text: {},
                    embedding: {}
                },
                configFiles: {
                    providers: { schema: {}, path: join(rootPath, 'agents/config/providers.json') },
                    models: { schema: { text: {}, embedding: {} }, path: join(rootPath, 'agents/config/models.json') },
                    tasks: {
                        schema: {
                            taskName: 'basic-clustering',
                            primaryModelId: 'gpt-4',
                            fallbackModelIds: ['gpt-4'],
                            temperature: 0.2,
                            requiredCapabilities: ['text-generation', 'chat', 'function-calling', 'tool-use'],
                            contextWindowSize: 'large-context-window',
                            thinkingLevel: 'high',
                            description: 'Create basic persona clusters from normalized profiles',
                            promptName: 'basic-clustering'
                        } as unknown as TaskDefinition,
                        path: join(rootPath, 'agents/persona-generator/config/tasks.json')
                    },
                    prompts: {
                        schema: {
                            name: 'persona-generator-prompts',
                            version: '1.0.0',
                            description: 'Prompt configurations for the persona generator agent',
                            prompts: {
                                'cluster-personas': {
                                    name: 'Cluster Personas',
                                    description: 'Clusters similar personas together based on attributes',
                                    systemPrompt: 'You are an expert at analyzing and grouping personas based on their characteristics. Your task is to identify patterns and similarities among personas and group them into meaningful clusters.',
                                    userPrompt: 'Analyze the following personas and group them into clusters based on their characteristics:\n\n{personas}\n\nFor each cluster, provide:\n1. Common characteristics\n2. Key differences\n3. Cluster size and composition\n4. Representative personas'
                                }
                            }
                        } as unknown as PromptConfig,
                        path: join(rootPath, 'agents/persona-generator/config/prompts.json')
                    }
                }
            }
        )

        // Add test profiles to state
        Object.assign(initialState, { normalizedProfiles: testProfiles })

        // Run the cluster personas node
        const result = await clusterPersonasNode(initialState, {} as RunnableConfig)

        // Verify state updates
        expect(result.status).toBe('clustering_complete')
        expect(result.completedSteps).toContain('cluster_personas')
        expect(result.logs).toContain('Created persona clusters')

        // Verify clusters
        expect(result.basicClusters).toBeDefined()
        expect(result.basicClusters.clusters).toBeDefined()
        expect(result.basicClusters.totalProfiles).toBe(1)

        // Verify file output
        const outputPath = join(clustersDir, 'basic-clusters.json')
        expect(fs.existsSync(outputPath)).toBe(true)

        const savedClusters = JSON.parse(fs.readFileSync(outputPath, 'utf-8'))
        expect(savedClusters.clusters).toBeDefined()
        expect(savedClusters.totalProfiles).toBe(1)
    })

    it('should handle empty profiles array', async () => {
        // Create initial state with no profiles
        const initialState = createInitialState(
            'test-run-id',
            outputDir,
            join(rootPath, 'data/normalized'),
            {
                rootPath,
                agentPath: join(rootPath, 'agents/persona-generator'),
                inputPath: join(rootPath, 'data/normalized'),
                outputPath: outputDir,
                logPath: join(rootPath, 'logs'),
                name: 'persona-generator',
                version: '1.0.0',
                description: 'Test agent for persona clustering',
                maxConcurrency: 5,
                maxRetries: 3,
                retryDelay: 1000,
                models: {
                    text: {},
                    embedding: {}
                },
                configFiles: {
                    providers: { schema: {}, path: join(rootPath, 'agents/config/providers.json') },
                    models: { schema: { text: {}, embedding: {} }, path: join(rootPath, 'agents/config/models.json') },
                    tasks: {
                        schema: {
                            taskName: 'basic-clustering',
                            primaryModelId: 'gpt-4',
                            fallbackModelIds: ['gpt-4'],
                            temperature: 0.2,
                            requiredCapabilities: ['text-generation', 'chat', 'function-calling', 'tool-use'],
                            contextWindowSize: 'large-context-window',
                            thinkingLevel: 'high',
                            description: 'Create basic persona clusters from normalized profiles',
                            promptName: 'basic-clustering'
                        } as unknown as TaskDefinition,
                        path: join(rootPath, 'agents/persona-generator/config/tasks.json')
                    },
                    prompts: {
                        schema: {
                            name: 'persona-generator-prompts',
                            version: '1.0.0',
                            description: 'Prompt configurations for the persona generator agent',
                            prompts: {
                                'cluster-personas': {
                                    name: 'Cluster Personas',
                                    description: 'Clusters similar personas together based on attributes',
                                    systemPrompt: 'You are an expert at analyzing and grouping personas based on their characteristics. Your task is to identify patterns and similarities among personas and group them into meaningful clusters.',
                                    userPrompt: 'Analyze the following personas and group them into clusters based on their characteristics:\n\n{personas}\n\nFor each cluster, provide:\n1. Common characteristics\n2. Key differences\n3. Cluster size and composition\n4. Representative personas'
                                }
                            }
                        } as unknown as PromptConfig,
                        path: join(rootPath, 'agents/persona-generator/config/prompts.json')
                    }
                }
            }
        )

        // Run the cluster personas node
        try {
            await clusterPersonasNode(initialState, {} as RunnableConfig)
            throw new Error('Expected clusterPersonasNode to throw an error')
        } catch (error) {
            expect(error instanceof Error).toBe(true)
            expect(error.message).toBe('No normalized profiles available for clustering')
        }
    })
}) 