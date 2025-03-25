import fs from 'node:fs'
import path from 'path'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { AgentState } from '../../agent-service/types.js'
import type { ImageDomainState, ImageInput, ImageOutput } from '../types.js'

/**
 * Node that saves the final results of image generation
 */
export class SaveResultsNode extends AgentNode<AgentState<ImageInput, ImageOutput, ImageDomainState>> {
    protected readonly debug: boolean = false

    async execute(state: AgentState<ImageInput, ImageOutput, ImageDomainState>): Promise<AgentState<ImageInput, ImageOutput, ImageDomainState>> {
        try {
            // Validate we have results to save
            if (!state.agentState.imageResults || state.agentState.imageResults.length === 0) {
                throw new Error('No image results available to save')
            }

            // Save final results
            const finalResults = {
                images: state.agentState.images,
                imageResults: state.agentState.imageResults,
                summary: {
                    ...state.output.summary,
                    completedAt: new Date().toISOString()
                }
            }

            fs.writeFileSync(
                path.join(state.input.outputDir, 'final-results.json'),
                JSON.stringify(finalResults, null, 2)
            )

            // Generate summary markdown
            const summary = [
                '# Image Generation Summary',
                '',
                `Total Profiles Analyzed: ${state.output.summary.totalProfiles}`,
                `Successful Generations: ${state.output.summary.successfulGenerations}`,
                `Failed Generations: ${state.output.summary.failedGenerations}`,
                `Total Duration: ${state.output.summary.totalDuration}ms`,
                `Total Tokens Used: ${state.output.summary.totalTokensUsed}`,
                `Completed At: ${finalResults.summary.completedAt}`,
                '',
                '## Image Results',
                '',
                ...state.agentState.imageResults.map(result => [
                    `### Profile: ${result.profileId}`,
                    `- Status: ${result.success ? '✅ Success' : '❌ Failed'}`,
                    result.error ? `- Error: ${result.error}` : '',
                    `- Duration: ${result.duration}ms`,
                    `- Model Used: ${result.modelUsed}`,
                    `- Tokens Used: ${result.tokensUsed}`,
                    result.imageUrl ? `- Image URL: ${result.imageUrl}` : '',
                    ''
                ].filter(Boolean).join('\n'))
            ].join('\n')

            fs.writeFileSync(
                path.join(state.input.outputDir, 'summary.md'),
                summary
            )

            return {
                ...state,
                status: {
                    ...state.status,
                    overallStatus: 'completed'
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