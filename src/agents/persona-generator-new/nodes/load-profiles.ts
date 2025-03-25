import fs from 'node:fs'
import path from 'path'
import { z } from 'zod'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { AgentState } from '../../agent-service/types.js'
import type { PersonaDomainState, PersonaInput, PersonaOutput } from '../types.js'

const ProfileSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    bio: z.string(),
    interests: z.array(z.string()),
    skills: z.array(z.string()),
    traits: z.array(z.string())
})

type Profile = z.infer<typeof ProfileSchema>

/**
 * Node that loads user profiles from input files
 */
export class LoadProfilesNode extends AgentNode<AgentState<PersonaInput, PersonaOutput, PersonaDomainState>> {
    protected readonly debug: boolean = false

    async execute(state: AgentState<PersonaInput, PersonaOutput, PersonaDomainState>): Promise<AgentState<PersonaInput, PersonaOutput, PersonaDomainState>> {
        // Load profiles from input directory
        const inputPath = path.join(state.config.inputPath, 'profiles')
        if (!fs.existsSync(inputPath)) {
            throw new Error(`Input profiles directory not found: ${inputPath}`)
        }

        const profileFiles = fs.readdirSync(inputPath)
            .filter(file => file.endsWith('.json'))

        if (profileFiles.length === 0) {
            throw new Error('No profile JSON files found in input directory')
        }

        // Load and validate each profile
        const profiles: Profile[] = []
        for (const file of profileFiles) {
            const filePath = path.join(inputPath, file)
            const content = fs.readFileSync(filePath, 'utf-8')
            const profile = ProfileSchema.parse(JSON.parse(content))
            profiles.push(profile)
        }

        // Save intermediate results in debug mode
        if (this.debug) {
            const outputPath = path.join(state.config.outputPath, 'intermediate')
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
    }
} 