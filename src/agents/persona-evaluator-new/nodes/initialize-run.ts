import fs from 'node:fs'
import path from 'node:path'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { AgentState } from '../../agent-service/types.js'
import type { EvaluatorDomainState, EvaluatorInput, EvaluatorOutput } from '../types.js'

/**
 * Node that initializes a new evaluation run
 */
export class InitializeRunNode extends AgentNode<AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState>> {
    protected readonly debug: boolean = false

    async execute(state: AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState>): Promise<AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState>> {
        try {
            // Create output directories
            const outputDir = state.input.outputDir
            fs.mkdirSync(outputDir, { recursive: true })
            fs.mkdirSync(path.join(outputDir, 'logs'), { recursive: true })
            fs.mkdirSync(path.join(outputDir, 'errors'), { recursive: true })
            fs.mkdirSync(path.join(outputDir, 'intermediate'), { recursive: true })

            return {
                ...state,
                status: {
                    ...state.status,
                    overallStatus: 'running'
                },
                agentState: {
                    ...state.agentState,
                    inputPersona: {},
                    elaboratedPersona: {},
                    evaluation: {},
                    executiveSummary: '',
                    fullProfile: '',
                    summaryReport: '',
                    elaborationCount: 0
                },
                output: {
                    ...state.output,
                    evaluation: {
                        answer: 'no',
                        recommendation: ''
                    },
                    executiveSummary: '',
                    fullProfile: '',
                    summaryReport: '',
                    summary: {
                        totalElaborations: 0,
                        finalEvaluation: '',
                        completedAt: ''
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