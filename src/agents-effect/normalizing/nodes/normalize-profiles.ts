import { Effect } from "effect"
import type { BaseProfile, NormalizedProfile } from "../../../agents/types.js"
import { extractJsonFromResponse } from "../../../agents/utils.js"
import type { ITaskService } from "../../../shared/services/task/types.js"
import type {
    NormalizationResult,
    NormalizeProfilesEffect,
    ProfileNormalizationError
} from "../types.js"

/**
 * Normalizes a batch of profiles using the task service
 */
export function normalizeProfiles(
    profiles: readonly BaseProfile[],
    taskService: ITaskService,
    batchSize: number = 2
): NormalizeProfilesEffect {
    return Effect.gen(function* (_) {
        // Process profiles in batches
        const results: NormalizationResult[] = []
        const normalizedProfiles: NormalizedProfile[] = []

        for (let i = 0; i < profiles.length; i += batchSize) {
            const batch = profiles.slice(i, i + batchSize)
            const batchResults = yield* _(
                Effect.all(
                    batch.map(profile => normalizeProfile(profile, taskService))
                )
            )

            // Collect results and profiles
            for (const result of batchResults) {
                results.push(result.result)
                if (result.normalizedProfile) {
                    normalizedProfiles.push(result.normalizedProfile)
                }
            }

            // Add delay between batches
            if (i + batchSize < profiles.length) {
                yield* _(Effect.sleep("3 seconds"))
            }
        }

        return normalizedProfiles
    })
}

/**
 * Normalizes a single profile using the task service
 */
function normalizeProfile(
    profile: BaseProfile,
    taskService: ITaskService
): Effect.Effect<{
    result: NormalizationResult
    normalizedProfile: NormalizedProfile | null
}, ProfileNormalizationError> {
    return Effect.gen(function* (_) {
        const startTime = Date.now()

        try {
            // Execute normalization task
            const taskResult = yield* _(
                Effect.tryPromise({
                    try: () => taskService.executeTask("normalize-profile", {
                        variables: {
                            input_profile: profile.content
                        },
                        format: "json"
                    }),
                    catch: (error) => new ProfileNormalizationError(
                        "Task execution failed",
                        profile.id,
                        error
                    )
                })
            )

            // Parse response
            const jsonContent = extractJsonFromResponse(taskResult.result)
            const normalizedProfile = JSON.parse(jsonContent) as NormalizedProfile

            // Add required fields
            normalizedProfile.id = crypto.randomUUID()
            normalizedProfile.sourceProfileId = profile.id

            const result: NormalizationResult = {
                profileId: profile.id,
                success: true,
                duration: Date.now() - startTime,
                modelUsed: "gpt-4-turbo-preview",
                tokensUsed: taskResult.usage?.totalTokens ?? 0
            }

            return { result, normalizedProfile }
        } catch (error) {
            const result: NormalizationResult = {
                profileId: profile.id,
                success: false,
                error: error instanceof Error ? error.message : String(error),
                duration: Date.now() - startTime,
                modelUsed: "gpt-4-turbo-preview",
                tokensUsed: 0
            }

            return { result, normalizedProfile: null }
        }
    })
} 