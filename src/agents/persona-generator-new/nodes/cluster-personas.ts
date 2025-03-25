import fs from 'node:fs'
import path from 'path'
import { z } from 'zod'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { AgentState } from '../../agent-service/types.js'
import { extractJsonFromResponse } from '../../utils.js'
import type { PersonaDomainState, PersonaInput, PersonaOutput } from '../types.js'

const ClusterSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    profiles: z.array(z.string()),
    commonInterests: z.array(z.string()),
    commonSkills: z.array(z.string()),
    commonTraits: z.array(z.string())
})

const ClusteringResultSchema = z.object({
    clusters: z.array(ClusterSchema),
    summary: z.string()
})

type ClusteringResult = z.infer<typeof ClusteringResultSchema>

/**
 * Node that clusters similar profiles together using LLM
 */
export class ClusterPersonasNode extends AgentNode<AgentState<PersonaInput, PersonaOutput, PersonaDomainState>> {
    protected readonly debug: boolean = false

    async execute(state: AgentState<PersonaInput, PersonaOutput, PersonaDomainState>): Promise<AgentState<PersonaInput, PersonaOutput, PersonaDomainState>> {
        // Validate we have profiles to cluster
        if (!state.agentState.profiles || state.agentState.profiles.length === 0) {
            throw new Error('No profiles available for clustering')
        }

        // Execute clustering task
        const taskResult = await this.taskService.executeTask('cluster-personas', {
            variables: {
                input_profiles: JSON.stringify(state.agentState.profiles, null, 2)
            },
            format: 'json'
        })

        // Parse and validate result
        const result = ClusteringResultSchema.parse(extractJsonFromResponse(taskResult.result))

        // Save intermediate results in debug mode
        if (this.debug) {
            const outputPath = path.join(state.config.outputPath, 'intermediate')
            fs.mkdirSync(outputPath, { recursive: true })
            fs.writeFileSync(
                path.join(outputPath, 'clustered-personas.json'),
                JSON.stringify(result, null, 2)
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
                clusters: result.clusters
            }
        }
    }
} 