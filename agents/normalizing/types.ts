import { z } from 'zod'
import { BaseResult, BaseProfile, NormalizedProfile, RunConfig } from '../types'

/**
 * Status states for normalization
 */
export const NormalizationStatusSchema = z.enum([
    'initializing',
    'loading',
    'normalizing',
    'saving',
    'completed',
    'error'
])

export type NormalizationStatus = z.infer<typeof NormalizationStatusSchema>

/**
 * Represents the result of normalizing a single profile
 */
export const NormalizationResultSchema = z.object({
    profileId: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
    duration: z.number(),
    modelUsed: z.string(),
    tokensUsed: z.number().optional(),
    normalizedProfile: z.string().optional()
})

export type NormalizationResult = z.infer<typeof NormalizationResultSchema>

/**
 * Summary statistics for a normalization run
 */
export const NormalizationSummarySchema = z.object({
    totalProfiles: z.number(),
    successfulNormalizations: z.number(),
    failedNormalizations: z.number(),
    totalDuration: z.number(),
    totalTokensUsed: z.number(),
    completedAt: z.string().datetime().optional()
})

export type NormalizationSummary = z.infer<typeof NormalizationSummarySchema>

// Re-export types we use from shared types
export type { BaseProfile as ProfileData, NormalizedProfile, RunConfig }
