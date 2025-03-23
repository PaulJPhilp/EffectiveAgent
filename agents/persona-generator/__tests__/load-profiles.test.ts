import type { RunnableConfig } from '@langchain/core/runnables'
import fs from 'node:fs'
import os from 'node:os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { ConfigurationLoader } from '../../../shared/services/configuration/index.js'
import { loadProfilesNode } from '../nodes/load-profiles.js'
import { createInitialState } from '../state.js'
import type { AgentConfig } from '../types.js'

describe('Load Profiles Node', () => {
    const rootPath = join(process.cwd(), 'agents/persona-generator')
    const configLoader = new ConfigurationLoader({
        basePath: join(rootPath, 'config'),
        environment: process.env.NODE_ENV,
        validateSchema: true
    })

    // Helper function to create a test profile
    function createTestProfile(id: string) {
        return {
            name: `Test User ${id}`,
            title: 'Software Engineer',
            location: 'San Francisco, CA',
            key_skills: ['TypeScript', 'Node.js', 'React'],
            contact: {
                email: `test${id}@example.com`,
                linkedin: `https://linkedin.com/in/test${id}`,
                company_website: 'https://example.com'
            },
            certificates: [
                {
                    status: 'Active',
                    name: 'AWS Certified Developer',
                    issuing_organization: 'Amazon Web Services',
                    issue_date: '2023-01-01',
                    expiration_date: '2026-01-01',
                    credential_id: `AWS-${id}`
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
    }

    it('should load and validate normalized profiles', async () => {
        // Create a temporary test directory
        const tempDir = await fs.promises.mkdtemp(join(os.tmpdir(), 'test-profiles-'))

        // Load config
        const config = await configLoader.loadConfig('config.json') as AgentConfig

        // Create test profile files
        const profiles = [
            createTestProfile('1'),
            createTestProfile('2'),
            createTestProfile('3')
        ]

        // Write test profiles to files
        for (let i = 0; i < profiles.length; i++) {
            await fs.promises.writeFile(
                join(tempDir, `profile-${i + 1}.json`),
                JSON.stringify(profiles[i], null, 2)
            )
        }

        // Create initial state
        const initialState = createInitialState(
            'test-run-id',
            join(process.cwd(), 'output'),
            tempDir,
            {
                ...config,
                name: 'persona-generator',
                version: '1.0.0',
                inputPath: tempDir
            }
        )

        // Run the load profiles node
        const result = await loadProfilesNode(initialState, {} as RunnableConfig)

        // Verify profiles were loaded
        expect(result.normalizedProfiles).toHaveLength(3)
        expect(result.status).toBe('loading_profiles')
        expect(result.completedSteps).toContain('load_profiles')
        expect(result.error).toBe('')
        expect(result.errorCount).toBe(0)

        // Verify profile content
        const sortedProfiles = [...result.normalizedProfiles].sort((a, b) =>
            (a as { name: string }).name.localeCompare((b as { name: string }).name)
        )
        sortedProfiles.forEach((profile, index) => {
            expect(profile.name).toBe(`Test User ${index + 1}`)
            expect(profile.title).toBe('Software Engineer')
            expect(profile.key_skills).toContain('TypeScript')
        })

        // Clean up test directory
        await fs.promises.rm(tempDir, { recursive: true, force: true })
    })

    it('should handle missing profiles directory', async () => {
        // Load config
        const config = await configLoader.loadConfig('config.json') as AgentConfig

        // Create initial state with non-existent directory
        const initialState = createInitialState(
            'test-run-id',
            join(process.cwd(), 'output'),
            '/non/existent/path',
            {
                ...config,
                name: 'persona-generator',
                version: '1.0.0',
                inputPath: '/non/existent/path'
            }
        )

        // Run the load profiles node
        try {
            await loadProfilesNode(initialState, {} as RunnableConfig)
            throw new Error('Expected loadProfilesNode to throw an error')
        } catch (error) {
            expect(error instanceof Error).toBe(true)
            expect(error.message).toContain('Directory not found')
        }
    })

    it('should handle invalid profile files', async () => {
        // Create a temporary test directory
        const tempDir = await fs.promises.mkdtemp(join(os.tmpdir(), 'test-profiles-'))

        // Load config
        const config = await configLoader.loadConfig('config.json') as AgentConfig

        // Create an invalid profile file
        await fs.promises.writeFile(
            join(tempDir, 'invalid-profile.json'),
            JSON.stringify({ invalid: 'profile' })
        )

        // Create initial state
        const initialState = createInitialState(
            'test-run-id',
            join(process.cwd(), 'output'),
            tempDir,
            {
                ...config,
                name: 'persona-generator',
                version: '1.0.0',
                inputPath: tempDir
            }
        )

        // Run the load profiles node
        try {
            await loadProfilesNode(initialState, {} as RunnableConfig)
            throw new Error('Expected loadProfilesNode to throw an error')
        } catch (error) {
            expect(error instanceof Error).toBe(true)
            expect(error.message).toContain('Failed to validate profile')
        }

        // Clean up test directory
        await fs.promises.rm(tempDir, { recursive: true, force: true })
    })
}) 