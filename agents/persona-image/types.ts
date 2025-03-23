import { z } from 'zod'
import { BaseResult, NormalizedProfile, RunConfig } from '../types'

/**
 * Status states for image generation
 */
export const ImageStatusSchema = z.enum([
    'initializing',
    'loading',
    'generating',
    'saving',
    'completed',
    'error'
])

export type ImageStatus = z.infer<typeof ImageStatusSchema>

/**
 * Represents the result of generating an image for a profile
 */
export const ImageResultSchema = z.object({
    profileId: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
    duration: z.number(),
    modelUsed: z.string(),
    tokensUsed: z.number().optional(),
    imageUrl: z.string().optional()
})

export type ImageResult = z.infer<typeof ImageResultSchema>

/**
 * Summary statistics for an image generation run
 */
export const ImageSummarySchema = z.object({
    totalProfiles: z.number(),
    successfulGenerations: z.number(),
    failedGenerations: z.number(),
    totalDuration: z.number(),
    totalTokensUsed: z.number(),
    completedAt: z.string().datetime().optional()
})

export type ImageSummary = z.infer<typeof ImageSummarySchema>

// Re-export types we use from shared types
export type { RunConfig, NormalizedProfile }
