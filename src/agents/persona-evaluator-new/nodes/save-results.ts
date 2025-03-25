import fs from 'node:fs'
import path from 'path'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { AgentState } from '../../agent-service/types.js'
import type { EvaluatorDomainState, EvaluatorInput, EvaluatorOutput } from '../types.js'

/**
 * Node that saves the final results of the evaluation
 */
export class SaveResultsNode extends AgentNode<AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState>> {
    protected readonly debug: boolean = false

    async execute(state: AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState>): Promise<AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState>> {
        try {
            // Save final results
            const finalResults = {
                evaluation: state.agentState.evaluation,
                executiveSummary: state.agentState.executiveSummary,
                fullProfile: state.agentState.fullProfile,
                summaryReport: state.agentState.summaryReport,
                summary: {
                    totalElaborations: state.agentState.elaborationCount,
                    finalEvaluation: state.agentState.evaluation.answer,
                    completedAt: new Date().toISOString()
                }
            }

            // Save all results
            fs.writeFileSync(
                path.join(state.input.outputDir, 'final-results.json'),
                JSON.stringify(finalResults, null, 2)
            )

            fs.writeFileSync(
                path.join(state.input.outputDir, 'executive-summary.md'),
                state.agentState.executiveSummary
            )

            fs.writeFileSync(
                path.join(state.input.outputDir, 'full-profile.md'),
                state.agentState.fullProfile
            )

            fs.writeFileSync(
                path.join(state.input.outputDir, 'summary-report.md'),
                state.agentState.summaryReport
            )

            return {
                ...state,
                status: {
                    ...state.status,
                    overallStatus: 'completed'
                },
                output: {
                    ...state.output,
                    summary: {
                        totalElaborations: state.agentState.elaborationCount,
                        finalEvaluation: state.agentState.evaluation.answer,
                        completedAt: new Date().toISOString()
                    }
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