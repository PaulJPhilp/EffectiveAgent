import { randomUUID } from 'crypto'
import fs from 'node:fs'
import path from 'path'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { AgentState } from '../../agent-service/types.js'
import type { NormalizedProfile } from '../../types.js'
import { chunkArray } from '../../utils.js'
import type { Image, ImageDomainState, ImageInput, ImageOutput, ImageResult } from '../types.js'

/**
 * Node that generates images for personas
 */
export class GenerateImagesNode extends AgentNode<AgentState<ImageInput, ImageOutput, ImageDomainState>> {
    protected readonly debug: boolean = false

    /**
     * Generates a single image using the configured LLM
     */
    private async generateImage(profile: NormalizedProfile): Promise<{
        readonly result: ImageResult
        readonly image: Image | null
    }> {
        const startTime = Date.now()

        try {
            const taskResult = await this.taskService.executeTask('generate-image', {
                variables: {
                    input_profile: JSON.stringify(profile)
                },
                format: 'image'
            })

            if (!taskResult.result) {
                throw new Error('No image generated')
            }

            const imageResult: ImageResult = {
                profileId: profile.id,
                success: true,
                duration: Date.now() - startTime,
                modelUsed: taskResult.modelId ?? 'unknown',
                tokensUsed: taskResult.usage?.totalTokens ?? 0,
                imageUrl: taskResult.result
            }

            const image: Image = {
                id: randomUUID(),
                content: taskResult.result,
                profileId: profile.id,
                url: taskResult.result
            }

            return { result: imageResult, image }
        } catch (error) {
            const imageResult: ImageResult = {
                profileId: profile.id,
                success: false,
                error: error instanceof Error ? error.message : String(error),
                duration: Date.now() - startTime,
                modelUsed: 'unknown',
                tokensUsed: 0
            }

            return { result: imageResult, image: null }
        }
    }

    async execute(state: AgentState<ImageInput, ImageOutput, ImageDomainState>): Promise<AgentState<ImageInput, ImageOutput, ImageDomainState>> {
        try {
            // Validate we have profiles to process
            if (!state.agentState.profiles || state.agentState.profiles.length === 0) {
                throw new Error('No profiles available for image generation')
            }

            // Process profiles in batches
            const chunkSize = 2
            const chunks = chunkArray<NormalizedProfile>(state.agentState.profiles, chunkSize)
            const outcomes: {
                readonly result: ImageResult
                readonly image: Image | null
            }[] = []

            for (const batch of chunks) {
                const batchResults = await Promise.all(
                    batch.map(profile => this.generateImage(profile))
                )
                outcomes.push(...batchResults)
                await new Promise(resolve => setTimeout(resolve, 3000))
            }

            const results = outcomes.map(outcome => outcome.result)
            const images = outcomes
                .map(outcome => outcome.image)
                .filter((image): image is Image => image !== null)

            const successfulGenerations = results.filter(result => result.success).length

            // Save intermediate results in debug mode
            if (this.debug) {
                const outputPath = path.join(state.input.outputDir, 'intermediate')
                fs.mkdirSync(outputPath, { recursive: true })
                fs.writeFileSync(
                    path.join(outputPath, 'generated-images.json'),
                    JSON.stringify({ results, images }, null, 2)
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
                    images,
                    imageResults: results
                },
                output: {
                    ...state.output,
                    images,
                    imageResults: results,
                    summary: {
                        ...state.output.summary,
                        totalProfiles: state.agentState.profiles.length,
                        successfulGenerations,
                        failedGenerations: state.agentState.profiles.length - successfulGenerations,
                        totalDuration: results.reduce((sum, result) => sum + result.duration, 0),
                        totalTokensUsed: results.reduce((sum, result) => sum + (result.tokensUsed ?? 0), 0)
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