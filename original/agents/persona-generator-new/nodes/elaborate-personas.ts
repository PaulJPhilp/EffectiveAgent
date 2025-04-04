import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { AgentState } from '../../agent-service/types.js'
import { extractJsonFromResponse } from '../../utils.js'
import type { PersonaDomainState, PersonaInput, PersonaOutput } from '../types.js'

const PersonaSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    background: z.string(),
    goals: z.array(z.string()),
    traits: z.array(z.string()),
    interests: z.array(z.string()),
    skills: z.array(z.string())
})

const ElaborationResultSchema = z.object({
    personas: z.array(PersonaSchema),
    summary: z.string()
})

export type ElaborationResult = z.infer<typeof ElaborationResultSchema>

/**
 * Node that elaborates basic clusters into detailed personas using LLM
 */
export class ElaboratePersonasNode extends AgentNode<AgentState<PersonaInput, PersonaOutput, PersonaDomainState>> {
    protected readonly debug: boolean = false

    async execute(state: AgentState<PersonaInput, PersonaOutput, PersonaDomainState>): Promise<AgentState<PersonaInput, PersonaOutput, PersonaDomainState>> {
        try {
            // Validate we have clusters to elaborate
            if (!state.agentState.clusters || state.agentState.clusters.length === 0) {
                throw new Error('No clusters available for elaboration')
            }

            // Execute elaboration task
            const taskResult = await this.taskService.executeTask('elaborate-personas', {
                variables: {
                    input_clusters: JSON.stringify(state.agentState.clusters, null, 2)
                },
                format: 'json'
            })

            // Parse and validate result
            const result = ElaborationResultSchema.parse(extractJsonFromResponse(taskResult.result))

            // Save intermediate results in debug mode
            if (this.debug) {
                const outputPath = path.join(state.config.outputPath, 'intermediate')
                fs.mkdirSync(outputPath, { recursive: true })
                fs.writeFileSync(
                    path.join(outputPath, 'elaborated-personas.json'),
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
                            nodeId: 'elaborate_personas',
                            status: 'completed',
                            timestamp: new Date().toISOString()
                        }
                    ]
                },
                agentState: {
                    ...state.agentState,
                    personas: result.personas
                }
            }
        } catch (error) {
            return {
                ...state,
                status: {
                    ...state.status,
                    overallStatus: 'error',
                    nodeHistory: [
                        ...state.status.nodeHistory,
                        {
                            nodeId: 'elaborate_personas',
                            status: 'error',
                            error: error instanceof Error ? error.message : 'Unknown error during elaboration',
                            timestamp: new Date().toISOString()
                        }
                    ]
                },
                errors: {
                    ...state.errors,
                    errors: [...state.errors.errors, error instanceof Error ? error.message : 'Unknown error during elaboration'],
                    errorCount: state.errors.errorCount + 1
                }
            }
        }
    }
} 