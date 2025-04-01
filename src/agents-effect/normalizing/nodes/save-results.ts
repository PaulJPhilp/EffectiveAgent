import { Effect } from "effect"
import { mkdir, writeFile } from "fs/promises"
import { join } from "path"
import type { NormalizedProfile } from "../../../agents/types.js"
import type { NormalizationResult, SaveResultsEffect } from "../types.js"
import { NormalizationError } from "../types.js"

/**
 * Saves normalized profiles and results to the output directory
 */
export function saveResults(
    profiles: readonly NormalizedProfile[],
    results: readonly NormalizationResult[],
    outputDir: string
): SaveResultsEffect {
    return Effect.gen(function* (_) {
        // Create output directory
        yield* _(
            Effect.tryPromise({
                try: () => mkdir(outputDir, { recursive: true }),
                catch: (error) => new NormalizationError(
                    `Failed to create output directory: ${error}`
                )
            })
        )

        // Save each normalized profile
        yield* _(
            Effect.all(
                profiles.map(profile =>
                    Effect.tryPromise({
                        try: async () => {
                            const profileDir = join(outputDir, profile.id)
                            await mkdir(profileDir, { recursive: true })
                            await writeFile(
                                join(profileDir, "profile.json"),
                                JSON.stringify(profile, null, 2)
                            )
                        },
                        catch: (error) => new NormalizationError(
                            `Failed to save profile ${profile.id}: ${error}`
                        )
                    })
                )
            )
        )

        // Save normalization results
        yield* _(
            Effect.tryPromise({
                try: () =>
                    writeFile(
                        join(outputDir, "normalization-results.json"),
                        JSON.stringify(results, null, 2)
                    ),
                catch: (error) => new NormalizationError(
                    `Failed to save normalization results: ${error}`
                )
            })
        )

        // Generate and save summary
        const summary = {
            totalProfiles: profiles.length,
            successfulNormalizations: results.filter(r => r.success).length,
            failedNormalizations: results.filter(r => !r.success).length,
            totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
            totalTokensUsed: results.reduce((sum, r) => sum + (r.tokensUsed ?? 0), 0)
        }

        yield* _(
            Effect.tryPromise({
                try: () =>
                    writeFile(
                        join(outputDir, "summary.json"),
                        JSON.stringify(summary, null, 2)
                    ),
                catch: (error) => new NormalizationError(
                    `Failed to save summary: ${error}`
                )
            })
        )
    })
} 