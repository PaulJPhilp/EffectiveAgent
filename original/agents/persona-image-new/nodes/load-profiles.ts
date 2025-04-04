import fs from 'node:fs'
import path from 'path'
import { z } from 'zod'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { AgentState } from '../../agent-service/types.js'
import type { ImageDomainState, ImageInput, ImageOutput } from '../types.js'

const NormalizedProfileSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    bio: z.string(),
    interests: z.array(z.string()),
    skills: z.array(z.string()),
    traits: z.array(z.string())
})

type NormalizedProfile = z.infer<typeof NormalizedProfileSchema>

/**
 * Node that loads normalized profiles from input directory
 */
export class LoadProfilesNode extends AgentNode<AgentState<ImageInput, ImageOutput, ImageDomainState>> {
    protected readonly debug: boolean = false

    async execute(state: AgentState<ImageInput, ImageOutput, ImageDomainState>): Promise<AgentState<ImageInput, ImageOutput, ImageDomainState>> {
        try {
            // Load profiles from input directory
            const inputPath = path.join(state.input.inputDir, 'profiles')
            if (!fs.existsSync(inputPath)) {
                throw new Error(`Input profiles directory not found: ${inputPath}`)
            }

            const profileFiles = fs.readdirSync(inputPath)
                .filter(file => file.endsWith('.json'))

            if (profileFiles.length === 0) {
                throw new Error('No profile JSON files found in input directory')
            }

            // Load and validate each profile
            const profiles: NormalizedProfile[] = []
            for (const file of profileFiles) {
                const filePath = path.join(inputPath, file)
                const content = fs.readFileSync(filePath, 'utf-8')
                const profile = NormalizedProfileSchema.parse(JSON.parse(content))
                profiles.push(profile)
            }

            // Save intermediate results in debug mode
            if (this.debug) {
                const outputPath = path.join(state.input.outputDir, 'intermediate')
                fs.mkdirSync(outputPath, { recursive: true })
                fs.writeFileSync(
                    path.join(outputPath, 'loaded-profiles.json'),
                    JSON.stringify(profiles, null, 2)
                )
            }

            return {
                ...state,
                status: {
                    ...state.status,
                    overallStatus: 'running'
                },
                agentState: {
                    ...state.agentState,
                    profiles
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return {
                ...state,
                status: {
                    ...state.status,
                    overallStatus: 'failed'
                },
                errors: {
                    ...state.errors,
                    errors: [...state.errors.errors, errorMessage],
                    errorCount: state.errors.errorCount + 1
                }
            }
        }
    }
} 