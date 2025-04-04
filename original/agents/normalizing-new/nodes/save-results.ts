import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { NormalizingAgentState } from '../types.js'

/**
 * Node for saving normalized profiles to disk
 */
export class SaveResultsNode extends AgentNode<NormalizingAgentState> {
    public readonly name = 'save_results'
    public readonly description = 'Saves normalized profiles and results to disk'

    /**
     * Executes the node's logic
     * @param state Current agent state
     * @returns Updated agent state
     */
    public async execute(state: NormalizingAgentState): Promise<NormalizingAgentState> {
        try {
            const { outputDir } = state.input
            const { normalizedProfiles, normalizationResults } = state.agentState
            const { summary } = state.output

            // Create output directory if it doesn't exist
            await mkdir(outputDir, { recursive: true })

            // Save each normalized profile
            await Promise.all(
                normalizedProfiles.map(async profile => {
                    const profileDir = join(outputDir, profile.id)
                    await mkdir(profileDir, { recursive: true })
                    await writeFile(
                        join(profileDir, 'profile.json'),
                        JSON.stringify(profile, null, 2)
                    )
                })
            )

            // Save normalization results
            await writeFile(
                join(outputDir, 'normalization-results.json'),
                JSON.stringify(normalizationResults, null, 2)
            )

            // Save summary
            await writeFile(
                join(outputDir, 'summary.json'),
                JSON.stringify(summary, null, 2)
            )

            return {
                ...state,
                status: {
                    ...state.status,
                    currentNode: this.name,
                    overallStatus: 'completed'
                },
                logs: {
                    ...state.logs,
                    logs: [
                        ...state.logs.logs,
                        `Saved ${normalizedProfiles.length} normalized profiles to ${outputDir}`
                    ],
                    logCount: state.logs.logCount + 1
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return {
                ...state,
                status: {
                    ...state.status,
                    currentNode: this.name,
                    overallStatus: 'failed'
                },
                errors: {
                    errors: [...state.errors.errors, errorMessage],
                    errorCount: state.errors.errorCount + 1
                }
            }
        }
    }
} 