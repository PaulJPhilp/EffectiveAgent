import fs from 'node:fs'
import path from 'path'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { AgentState } from '../../agent-service/types.js'
import { extractJsonFromResponse } from '../../utils.js'
import type { Evaluation, EvaluatorDomainState, EvaluatorInput, EvaluatorOutput } from '../types.js'

/**
 * Node that evaluates a persona for completeness and quality
 */
export class EvaluatePersonaNode extends AgentNode<AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState>> {
    protected readonly debug: boolean = false

    async execute(state: AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState>): Promise<AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState>> {
        try {
            // Execute the evaluation task
            const taskResult = await this.taskService.executeTask('evaluate-persona', {
                variables: {
                    elaborated_persona: JSON.stringify(state.agentState.elaboratedPersona)
                },
                format: 'json'
            })

            if (!taskResult.result) {
                throw new Error('No evaluation result received')
            }

            // Parse the evaluation result
            const jsonContent = extractJsonFromResponse(taskResult.result)
            const evaluation = JSON.parse(jsonContent) as Evaluation

            // Save intermediate results in debug mode
            if (this.debug) {
                const outputPath = path.join(state.input.outputDir, 'intermediate')
                fs.mkdirSync(outputPath, { recursive: true })
                fs.writeFileSync(
                    path.join(outputPath, 'evaluation-result.json'),
                    JSON.stringify(evaluation, null, 2)
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
                    evaluation
                },
                output: {
                    ...state.output,
                    evaluation
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