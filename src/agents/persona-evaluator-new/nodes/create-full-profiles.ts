import fs from 'node:fs'
import path from 'path'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { AgentState } from '../../agent-service/types.js'
import type { EvaluatorDomainState, EvaluatorInput, EvaluatorOutput } from '../types.js'

/**
 * Node that creates full profile documents for the evaluated persona
 */
export class CreateFullProfilesNode extends AgentNode<AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState>> {
    protected readonly debug: boolean = false

    async execute(state: AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState>): Promise<AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState>> {
        try {
            // Execute the profile task
            const taskResult = await this.taskService.executeTask('create-full-profile', {
                variables: {
                    elaborated_persona: JSON.stringify(state.agentState.elaboratedPersona),
                    evaluation: JSON.stringify(state.agentState.evaluation),
                    executive_summary: state.agentState.executiveSummary
                },
                format: 'text'
            })

            if (!taskResult.result) {
                throw new Error('No profile result received')
            }

            const fullProfile = taskResult.result

            // Generate summary report
            const summaryReport = [
                '# Persona Evaluation Summary Report',
                '',
                '## Executive Summary',
                state.agentState.executiveSummary,
                '',
                '## Evaluation Results',
                `- Final Decision: ${state.agentState.evaluation.answer}`,
                `- Recommendation: ${state.agentState.evaluation.recommendation}`,
                '',
                '## Full Profile',
                fullProfile
            ].join('\n')

            // Save intermediate results in debug mode
            if (this.debug) {
                const outputPath = path.join(state.input.outputDir, 'intermediate')
                fs.mkdirSync(outputPath, { recursive: true })
                fs.writeFileSync(
                    path.join(outputPath, 'full-profile.md'),
                    fullProfile
                )
                fs.writeFileSync(
                    path.join(outputPath, 'summary-report.md'),
                    summaryReport
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
                    fullProfile,
                    summaryReport
                },
                output: {
                    ...state.output,
                    fullProfile,
                    summaryReport
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