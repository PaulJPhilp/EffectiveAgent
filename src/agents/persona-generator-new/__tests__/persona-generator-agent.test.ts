import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ModelService } from '../../../shared/services/model/modelService.js'
import { PersonaGeneratorAgent } from '../persona-generator-agent.js'
import type { PersonaInput } from '../types.js'

describe('PersonaGeneratorAgent', () => {
    let agent: PersonaGeneratorAgent
    let testInput: PersonaInput
    let testInputPath: string
    const agentName = 'persona-generator-new'

    beforeEach(() => {
        // Set up test input directory
        const testInputDir = 'test-input'
        if (!fs.existsSync(testInputDir)) {
            fs.mkdirSync(testInputDir, { recursive: true })
        }

        // Create test input file with relative path
        testInputPath = path.join(testInputDir, 'sample-profiles.json')
        const sampleProfiles = [
            {
                id: 'profile1',
                name: 'Alice Smith',
                bio: 'Senior software engineer with 8 years of experience in full-stack development',
                interests: ['distributed systems', 'cloud architecture', 'machine learning'],
                skills: ['TypeScript', 'Node.js', 'React', 'AWS', 'Docker'],
                traits: ['analytical', 'problem-solver', 'team player']
            },
            {
                id: 'profile2',
                name: 'Bob Johnson',
                bio: 'Data scientist specializing in machine learning and AI applications',
                interests: ['artificial intelligence', 'deep learning', 'data visualization'],
                skills: ['Python', 'TensorFlow', 'PyTorch', 'SQL', 'Data Analysis'],
                traits: ['detail-oriented', 'innovative', 'curious']
            },
            {
                id: 'profile3',
                name: 'Carol Davis',
                bio: 'DevOps engineer focused on cloud infrastructure and automation',
                interests: ['infrastructure automation', 'cloud computing', 'system reliability'],
                skills: ['Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Python'],
                traits: ['systematic', 'proactive', 'collaborative']
            }
        ]
        fs.writeFileSync(testInputPath, JSON.stringify(sampleProfiles, null, 2))

        // Mock the model service's generateText method
        vi.spyOn(ModelService.prototype, 'generateText').mockResolvedValue({
            text: JSON.stringify({
                clusters: [
                    {
                        id: 'cluster1',
                        name: 'Tech Leaders',
                        description: 'Experienced professionals in software and infrastructure',
                        profiles: ['profile1', 'profile3'],
                        commonCharacteristics: {
                            skills: ['AWS', 'Python'],
                            interests: ['cloud computing', 'infrastructure'],
                            traits: ['analytical', 'systematic']
                        }
                    },
                    {
                        id: 'cluster2',
                        name: 'Data Scientists',
                        description: 'Specialists in machine learning and data analysis',
                        profiles: ['profile2'],
                        commonCharacteristics: {
                            skills: ['Python', 'TensorFlow', 'PyTorch'],
                            interests: ['artificial intelligence', 'machine learning'],
                            traits: ['detail-oriented', 'innovative']
                        }
                    }
                ]
            }),
            usage: {
                promptTokens: 100,
                completionTokens: 200,
                totalTokens: 300
            },
            model: 'gpt-35-turbo',
            finishReason: 'stop'
        })

        // Initialize agent and test input
        agent = new PersonaGeneratorAgent('persona-generator-new')
        testInput = {
            profiles: [testInputPath]
        }
    })

    afterEach(() => {
        // Clean up test directories
        const testDirs = [
            'test-input',
            'test-output'
        ]
        for (const dir of testDirs) {
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true })
            }
        }

        // Restore all mocks
        vi.restoreAllMocks()
    })

    it('should process profiles and generate personas', async () => {
        const result = await agent.run(testInput)

        // Check overall status
        expect(result.status.overallStatus).toBe('completed')
        expect(result.errors.errorCount).toBe(0)

        // Check state progression
        expect(result.agentState.profiles.length).toBeGreaterThan(0)
        expect(result.agentState.clusters.length).toBeGreaterThan(0)
        expect(result.agentState.personas.length).toBeGreaterThan(0)

        // Check output
        expect(result.output.clusters).toEqual(result.agentState.clusters)
        expect(result.output.personas).toEqual(result.agentState.personas)

        // Check output directory structure
        const runDir = result.agentRun.outputDir
        expect(fs.existsSync(runDir)).toBe(true)
        expect(fs.existsSync(path.join(runDir, 'logs'))).toBe(true)
        expect(fs.existsSync(path.join(runDir, 'errors'))).toBe(true)
    })

    it('should handle invalid input gracefully', async () => {
        const invalidInput: PersonaInput = {
            profiles: ['nonexistent/file.json']
        }

        const result = await agent.run(invalidInput)

        // Check error state
        expect(result.status.overallStatus).toBe('error')
        expect(result.errors.errorCount).toBe(1)
        expect(result.errors.errors[0]).toContain('Failed to load profile at nonexistent/file.json')

        // Check node history
        const lastNode = result.status.nodeHistory[result.status.nodeHistory.length - 1]
        expect(lastNode.nodeId).toBe('load_profiles')
        expect(lastNode.status).toBe('error')
        expect(lastNode.error).toContain('Failed to load profile at nonexistent/file.json')
    })
}) 