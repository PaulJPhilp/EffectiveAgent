import fs from 'node:fs'
import path from 'path'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { AgentState } from '../../agent-service/types.js'
import type { EvaluatorDomainState, EvaluatorInput, EvaluatorOutput } from '../types.js'

/**
 * Node that creates executive summaries for the evaluated persona
 */
export class CreateExecutiveSummariesNode extends AgentNode<AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState>> {
    protected readonly debug: boolean = false

    async execute(state: AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState>): Promise<AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState>> {
        try {
            // Execute the summary task
            const taskResult = await this.taskService.executeTask('create-executive-summary', {
                variables: {
                    elaborated_persona: JSON.stringify(state.agentState.elaboratedPersona),
                    evaluation: JSON.stringify(state.agentState.evaluation)
                },
                format: 'text'
            })

            if (!taskResult.result) {
                throw new Error('No summary result received')
            }

            const executiveSummary = taskResult.result

            // Save intermediate results in debug mode
            if (this.debug) {
                const outputPath = path.join(state.input.outputDir, 'intermediate')
                fs.mkdirSync(outputPath, { recursive: true })
                fs.writeFileSync(
                    path.join(outputPath, 'executive-summary.md'),
                    executiveSummary
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
                    executiveSummary
                },
                output: {
                    ...state.output,
                    executiveSummary
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