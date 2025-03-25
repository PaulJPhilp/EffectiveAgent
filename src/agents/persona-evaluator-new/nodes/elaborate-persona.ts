import fs from 'node:fs'
import path from 'path'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { AgentState } from '../../agent-service/types.js'
import { extractJsonFromResponse } from '../../utils.js'
import type { ElaboratedPersona, EvaluatorDomainState, EvaluatorInput, EvaluatorOutput } from '../types.js'

/**
 * Node that elaborates a persona with more detailed information
 */
export class ElaboratePersonaNode extends AgentNode<AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState>> {
    protected readonly debug: boolean = false

    async execute(state: AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState>): Promise<AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState>> {
        try {
            // Execute the elaboration task
            const taskResult = await this.taskService.executeTask('elaborate-persona', {
                variables: {
                    input_persona: JSON.stringify(state.agentState.inputPersona)
                },
                format: 'json'
            })

            if (!taskResult.result) {
                throw new Error('No elaboration result received')
            }

            // Parse the elaborated persona
            const jsonContent = extractJsonFromResponse(taskResult.result)
            const elaboratedPersona = JSON.parse(jsonContent) as ElaboratedPersona

            // Save intermediate results in debug mode
            if (this.debug) {
                const outputPath = path.join(state.input.outputDir, 'intermediate')
                fs.mkdirSync(outputPath, { recursive: true })
                fs.writeFileSync(
                    path.join(outputPath, 'elaborated-persona.json'),
                    JSON.stringify(elaboratedPersona, null, 2)
                )
            }

            // Update elaboration count
            const elaborationCount = (state.agentState.elaborationCount || 0) + 1

            return {
                ...state,
                status: {
                    ...state.status,
                    overallStatus: 'running'
                },
                agentState: {
                    ...state.agentState,
                    elaboratedPersona,
                    elaborationCount
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