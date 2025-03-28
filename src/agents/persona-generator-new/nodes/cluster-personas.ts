import fs from 'node:fs'
import path from 'path'
import { z } from 'zod'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { AgentState } from '../../agent-service/types.js'
import type { PersonaDomainState, PersonaInput, PersonaOutput } from '../types.js'

const ClusterSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    profiles: z.array(z.string()),
    commonCharacteristics: z.object({
        skills: z.array(z.string()),
        interests: z.array(z.string()),
        traits: z.array(z.string())
    })
})

const ClusteringResultSchema = z.object({
    clusters: z.array(ClusterSchema)
})


/**
 * Node that clusters similar profiles together using LLM
 */
export class ClusterPersonasNode extends AgentNode<AgentState<PersonaInput, PersonaOutput, PersonaDomainState>> {
    protected readonly debug: boolean = false

    async execute(state: AgentState<PersonaInput, PersonaOutput, PersonaDomainState>): Promise<AgentState<PersonaInput, PersonaOutput, PersonaDomainState>> {
        try {
            // Validate we have profiles to cluster
            if (!state.agentState.profiles || state.agentState.profiles.length === 0) {
                throw new Error('No profiles available for clustering')
            }

            // Format profiles for the task
            const formattedProfiles = state.agentState.profiles.map(profile => ({
                id: profile.id,
                name: profile.name,
                bio: profile.bio,
                interests: profile.interests,
                skills: profile.skills,
                traits: profile.traits
            }))

            // Execute clustering task
            const taskResult = await this.taskService.executeTask('cluster-personas', {
                variables: {
                    profiles: JSON.stringify(formattedProfiles, null, 2)
                },
                format: 'json'
            })

            // Parse and validate result
            const result = ClusteringResultSchema.parse(JSON.parse(taskResult.result))

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
                    overallStatus: 'running',
                    nodeHistory: [
                        ...state.status.nodeHistory,
                        {
                            nodeId: 'cluster_personas',
                            status: 'completed',
                            timestamp: new Date().toISOString()
                        }
                    ]
                },
                agentState: {
                    ...state.agentState,
                    clusters: result.clusters
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error during clustering'
            console.error('Clustering error:', errorMessage)

            return {
                ...state,
                status: {
                    ...state.status,
                    overallStatus: 'error',
                    nodeHistory: [
                        ...state.status.nodeHistory,
                        {
                            nodeId: 'cluster_personas',
                            status: 'error',
                            error: errorMessage,
                            timestamp: new Date().toISOString()
                        }
                    ]
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