import { randomUUID } from 'crypto'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { BaseProfile } from '../../types.js'
import { chunkArray, extractJsonFromResponse } from '../../utils.js'
import type { NormalizationResult, NormalizedProfile, NormalizingAgentState } from '../types.js'

/**
 * Node for normalizing profile data using LLM
 */
export class NormalizeProfilesNode extends AgentNode<NormalizingAgentState> {
    public readonly name = 'normalize_profiles'
    public readonly description = 'Normalizes profile data using LLM'

    /**
     * Normalizes a single profile using the configured LLM
     * @param profile Profile data to normalize
     * @returns Normalization result and normalized profile
     */
    private async normalizeProfile(profile: BaseProfile): Promise<{
        readonly result: NormalizationResult
        readonly normalizedProfile: NormalizedProfile | null
    }> {
        const startTime = Date.now()

        try {
            const taskResult = await this.taskService.executeTask('normalize-profile', {
                variables: {
                    input_profile: profile.content
                },
                format: 'json'
            })

            const jsonContent = extractJsonFromResponse(taskResult.result)
            const normalizedProfile: NormalizedProfile = JSON.parse(jsonContent) as NormalizedProfile
            normalizedProfile.id = randomUUID()
            normalizedProfile.sourceProfileId = profile.id

            const normalizationResult: NormalizationResult = {
                profileId: profile.id,
                success: true,
                duration: Date.now() - startTime,
                modelUsed: 'gpt-4-turbo-preview',
                tokensUsed: 0
            }

            return { result: normalizationResult, normalizedProfile }
        } catch (error) {
            const normalizationResult: NormalizationResult = {
                profileId: profile.id,
                success: false,
                error: error instanceof Error ? error.message : String(error),
                duration: Date.now() - startTime,
                modelUsed: 'gpt-4-turbo-preview',
                tokensUsed: 0
            }

            return { result: normalizationResult, normalizedProfile: null }
        }
    }

    /**
     * Executes the node's logic
     * @param state Current agent state
     * @returns Updated agent state
     */
    public async execute(state: NormalizingAgentState): Promise<NormalizingAgentState> {
        try {
            const { profiles } = state.agentState
            const chunkSize = 2
            const chunks = chunkArray<BaseProfile>(profiles, chunkSize)
            const outcomes: {
                readonly result: NormalizationResult
                readonly normalizedProfile: NormalizedProfile | null
            }[] = []

            for (const batch of chunks) {
                const batchResults = await Promise.all(
                    batch.map(profile => this.normalizeProfile(profile))
                )
                outcomes.push(...batchResults)
                await new Promise(resolve => setTimeout(resolve, 3000))
            }

            const results = outcomes.map(outcome => outcome.result)
            const normalizedProfiles = outcomes
                .map(outcome => outcome.normalizedProfile)
                .filter((profile): profile is NormalizedProfile => profile !== null)

            const successfulNormalizations = results.filter(result => result.success).length

            return {
                ...state,
                status: {
                    ...state.status,
                    currentNode: this.name,
                    overallStatus: 'running'
                },
                agentState: {
                    ...state.agentState,
                    normalizedProfiles,
                    normalizationResults: results
                },
                output: {
                    ...state.output,
                    normalizedProfiles,
                    summary: {
                        totalProfiles: profiles.length,
                        successfulNormalizations,
                        failedNormalizations: profiles.length - successfulNormalizations,
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
                    currentNode: this.name,
                    overallStatus: 'error'
                },
                errors: {
                    errors: [...state.errors.errors, errorMessage],
                    errorCount: state.errors.errorCount + 1
                }
            }
        }
    }
} 