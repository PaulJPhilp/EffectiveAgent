import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { ConfigurationLoader } from '../../../shared/services/configuration/index.js'
import { initializeRunNode } from '../nodes/initialize-run.js'
import type { ClusteringState } from '../state.js'
import type { AgentConfig } from '../types.js'

describe('Initialize Run Node', () => {
    const rootPath = join(process.cwd(), 'agents/persona-generator')
    const configLoader = new ConfigurationLoader({
        basePath: join(rootPath, 'config'),
        environment: process.env.NODE_ENV,
        validateSchema: true
    })

    it('should initialize run state with correct configuration', async () => {
        // Load config
        const config = await configLoader.loadConfig('config.json') as AgentConfig

        // Create initial state
        const initialState: ClusteringState = {
            config,
            runInfo: {
                runId: '',
                startTime: '',
                outputDir: '',
                inputDir: config.inputPath // Set inputDir from config
            },
            normalizedProfiles: [],
            basicClusters: [],
            currentClusterIndex: 0,
            inputPersona: null,
            elaboratedPersonas: [],
            error: '',
            status: 'initializing',
            completedSteps: [],
            logs: [],
            recommendations: [],
            errorCount: 0
        }

        // Run the initialize node
        const result = await initializeRunNode(initialState)

        // Verify run info
        expect(result.runInfo.runId).toMatch(/^run-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9]{8}$/)
        expect(result.runInfo.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
        expect(result.runInfo.outputDir).toMatch(/^\/Users\/paul\/projects\/pdf-loader\/output\/persona-generator\/runs\/run-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9]{8}$/)
        expect(result.runInfo.inputDir).toBe(config.inputPath)

        // Verify state updates
        expect(result.status).toBe('loading')
        expect(result.completedSteps).toContain('initialize_run')
        expect(result.logs).toContain(`Run ${result.runInfo.runId} initialized`)
        expect(result.error).toBe('')
        expect(result.errorCount).toBe(0)
    })

    it('should handle initialization errors gracefully', async () => {
        // Load config
        const config = await configLoader.loadConfig('config.json') as AgentConfig

        // Create initial state with invalid config to trigger error
        const initialState: ClusteringState = {
            config: {
                ...config,
                outputPath: '/invalid/path' // This should cause a permission error
            },
            runInfo: {
                runId: '',
                startTime: '',
                outputDir: '',
                inputDir: config.inputPath
            },
            normalizedProfiles: [],
            basicClusters: [],
            currentClusterIndex: 0,
            inputPersona: null,
            elaboratedPersonas: [],
            error: '',
            status: 'initializing',
            completedSteps: [],
            logs: [],
            recommendations: [],
            errorCount: 0
        }

        // Run the initialize node
        const result = await initializeRunNode(initialState)

        // Verify error handling
        expect(result.status).toBe('error')
        expect(result.error).toContain('Error initializing run')
        expect(result.errorCount).toBe(1)
        expect(result.logs[0]).toContain('Error initializing run')
    })

    it('should create unique run IDs for each initialization', async () => {
        // Load config
        const config = await configLoader.loadConfig('config.json') as AgentConfig

        // Create initial state
        const initialState: ClusteringState = {
            config,
            runInfo: {
                runId: '',
                startTime: '',
                outputDir: '',
                inputDir: config.inputPath
            },
            normalizedProfiles: [],
            basicClusters: [],
            currentClusterIndex: 0,
            inputPersona: null,
            elaboratedPersonas: [],
            error: '',
            status: 'initializing',
            completedSteps: [],
            logs: [],
            recommendations: [],
            errorCount: 0
        }

        // Run the initialize node twice
        const result1 = await initializeRunNode(initialState)
        const result2 = await initializeRunNode(initialState)

        // Verify run IDs are unique
        expect(result1.runInfo.runId).not.toBe(result2.runInfo.runId)
    })
}) 