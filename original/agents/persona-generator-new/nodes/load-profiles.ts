import { mkdir, readFile, readdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { z } from 'zod'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { PersonaGeneratorState } from '../persona-generator-agent.js'
import type { Profile } from '../types.js'
import * as fs from 'fs'

// Profile schema
const ProfileSchema = z.object({
    id: z.string(),
    name: z.string(),
    bio: z.string(),
    interests: z.array(z.string()),
    skills: z.array(z.string()),
    traits: z.array(z.string())
})

/**
 * Node that loads user profiles from input files
 */
export class LoadProfilesNode extends AgentNode<PersonaGeneratorState> {
    protected readonly debug: boolean = false

    async execute(state: PersonaGeneratorState): Promise<PersonaGeneratorState> {
        const { inputDir, outputDir } = state.input
        const profilePaths = fs.readdirSync(inputDir)
        const errors: string[] = []

        try {
            let profiles: Profile[] = []

            // Process each profile path
            for (const profilePath of profilePaths) {
                if (this.debug) {
                    console.log(`Processing profile: ${profilePath}`)
                }
                try {
                    // Check if profilePath is a direct file path
                    if (profilePath.endsWith('.json')) {
                        const fileContent = await readFile(join(inputDir, profilePath), 'utf-8')
                        const data = JSON.parse(fileContent)

                        // Handle both single profile and array of profiles
                        const parsedProfiles = Array.isArray(data)
                            ? await Promise.all(data.map(profile => ProfileSchema.parseAsync(profile)))
                            : [await ProfileSchema.parseAsync(data)]

                        profiles.push(...parsedProfiles)
                    } else {
                        // Treat as directory and scan for JSON files
                        const files = await readdir(profilePath)
                        const jsonFiles = files.filter(file => file.endsWith('.json'))

                        const dirProfiles = await Promise.all(
                            jsonFiles.map(async file => {
                                const filePath = join(profilePath, file)
                                const content = await readFile(filePath, 'utf-8')
                                const data = JSON.parse(content)
                                return ProfileSchema.parseAsync(data)
                            })
                        )
                        profiles.push(...dirProfiles)
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error
                        ? `Failed to load profile at ${profilePath}: ${error.message}`
                        : `Failed to load profile at ${profilePath}`
                    errors.push(errorMessage)
                }
            }

            if (profiles.length === 0) {
                throw new Error('No valid profiles found')
            }

            // Save intermediate results in debug mode
            if (this.debug) {
                const outputPath = join(outputDir, 'intermediate')
                await mkdir(outputPath, { recursive: true })
                await writeFile(
                    join(outputPath, 'loaded-profiles.json'),
                    JSON.stringify(profiles, null, 2)
                )
            }

            // If we have any errors but also some valid profiles, we can continue
            if (errors.length > 0) {
                return {
                    ...state,
                    status: {
                        ...state.status,
                        overallStatus: 'running',
                        nodeHistory: [
                            ...state.status.nodeHistory,
                            {
                                nodeId: 'load_profiles',
                                status: 'completed',
                                timestamp: new Date().toISOString()
                            }
                        ]
                    },
                    agentState: {
                        ...state.agentState,
                        profiles
                    },
                    errors: {
                        errors: [...state.errors.errors, ...errors],
                        errorCount: state.errors.errorCount + errors.length
                    }
                }
            }

            // No errors, all profiles loaded successfully
            return {
                ...state,
                status: {
                    ...state.status,
                    overallStatus: 'running',
                    nodeHistory: [
                        ...state.status.nodeHistory,
                        {
                            nodeId: 'load_profiles',
                            status: 'completed',
                            timestamp: new Date().toISOString()
                        }
                    ]
                },
                agentState: {
                    ...state.agentState,
                    profiles
                }
            }
        } catch (error) {
            // Critical error - no profiles could be loaded
            const errorMessage = error instanceof Error ? error.message : 'Unknown error loading profiles'
            return {
                ...state,
                status: {
                    ...state.status,
                    overallStatus: 'error',
                    nodeHistory: [
                        ...state.status.nodeHistory,
                        {
                            nodeId: 'load_profiles',
                            status: 'error',
                            error: errorMessage,
                            timestamp: new Date().toISOString()
                        }
                    ]
                },
                errors: {
                    errors: [...state.errors.errors, errorMessage],
                    errorCount: state.errors.errorCount + 1
                }
            }
        }
    }
} 